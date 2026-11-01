import pytest
import os
import json
import jwt
from fastapi.testclient import TestClient

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api import app, _CHAT_REQUESTS
from backend.db import Base, get_db
from backend.security import create_access_token, hash_password, verify_password, JWT_SECRET_KEY, JWT_ALGORITHM
from backend.routers.auth import _FAILED_ATTEMPTS, clear_failed_attempts

TEST_VULN_DB = "sqlite:///:memory:"
engine = create_engine(TEST_VULN_DB, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_vuln_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Reset rate limiter state before each security test."""
    _FAILED_ATTEMPTS.clear()
    _CHAT_REQUESTS.clear()
    yield
    _FAILED_ATTEMPTS.clear()
    _CHAT_REQUESTS.clear()


class TestSecurityHardening:

    def test_security_headers_enforced(self):
        """Verify OWASP-recommended HTTP security headers on all responses."""
        res = client.get("/api/health")
        assert res.status_code == 200
        assert res.headers.get("x-content-type-options") == "nosniff"
        assert res.headers.get("x-frame-options") == "DENY"
        assert res.headers.get("x-xss-protection") == "1; mode=block"
        assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
        assert "camera=()" in res.headers.get("permissions-policy", "")

    def test_cors_not_wildcard_with_credentials(self):
        """Verify CORS does not allow unrestricted origin reflection."""
        res = client.options(
            "/api/health",
            headers={
                "Origin": "https://evil-attacker-site.com",
                "Access-Control-Request-Method": "GET"
            }
        )
        # Should not reflect the evil attacker site
        allow_origin = res.headers.get("access-control-allow-origin")
        assert allow_origin != "https://evil-attacker-site.com"
        assert allow_origin != "*"

    def test_password_length_guards_against_dos(self):
        """Verify passwords over 128 bytes are blocked to prevent bcrypt CPU starvation."""
        huge_password = "A" * 200
        res = client.post("/api/auth/register", json={
            "email": "dos_tester@test.com",
            "password": huge_password
        })
        assert res.status_code == 422  # Blocked at schema validation layer

    def test_password_minimum_length_enforced(self):
        """Verify short passwords under 8 characters are rejected."""
        short_password = "short"
        res = client.post("/api/auth/register", json={
            "email": "short_tester@test.com",
            "password": short_password
        })
        assert res.status_code == 422

    def test_otp_brute_force_lockout(self):
        """Verify that 5 failed OTP attempts lock out the client IP with 429."""
        ip = "127.0.0.1"
        clear_failed_attempts(ip)

        for attempt in range(5):
            res = client.post("/api/auth/verify-otp", json={
                "target": "9876543210",
                "otp_code": f"00000{attempt}",
                "purpose": "login"
            })
            assert res.status_code == 400

        # The 6th attempt must be locked out with HTTP 429
        locked_res = client.post("/api/auth/verify-otp", json={
            "target": "9876543210",
            "otp_code": "123456",
            "purpose": "login"
        })
        assert locked_res.status_code == 429
        assert "Too many failed attempts" in locked_res.json()["detail"]

    def test_dev_otp_suppressed_in_production(self, monkeypatch):
        """Verify dev_otp is omitted when ENVIRONMENT is set to production."""
        from backend.routers import auth as auth_module
        monkeypatch.setattr(auth_module, "ENV_MODE", "production")

        res = client.post("/api/auth/send-otp", json={
            "target": "prod_test@terminal.ai",
            "purpose": "login"
        })
        assert res.status_code == 200
        data = res.json()
        assert data.get("dev_otp") is None  # dev_otp must be None in production!

    def test_idor_protection_between_users(self):
        """Verify User B cannot view, modify, or delete User A's saved simulation."""
        # 1. Register User A
        email_a = "user_alpha_sec@terminal.ai"
        res_a = client.post("/api/auth/register", json={
            "email": email_a,
            "password": "Password123Alpha!",
            "full_name": "User Alpha"
        })
        token_a = res_a.json()["access_token"]

        # 2. Register User B
        email_b = "user_beta_sec@terminal.ai"
        res_b = client.post("/api/auth/register", json={
            "email": email_b,
            "password": "Password123Beta!",
            "full_name": "User Beta"
        })
        token_b = res_b.json()["access_token"]

        # 3. User A creates a simulation
        sim_payload = {
            "title": "Alpha Confidential Scenario",
            "inputs": {"issue_size": 1200, "offer_price": 500},
            "results": {"expected_gain": 45.2}
        }
        create_res = client.post(
            "/api/user/simulations",
            json=sim_payload,
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert create_res.status_code == 201
        sim_id = create_res.json()["id"]

        # 4. User B attempts to read simulations (User A's simulation must NOT be visible)
        b_sims = client.get(
            "/api/user/simulations",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert b_sims.status_code == 200
        b_sim_ids = [s["id"] for s in b_sims.json()]
        assert sim_id not in b_sim_ids

        # 5. User B attempts to delete User A's simulation (IDOR attack)
        del_res = client.delete(
            f"/api/user/simulations/{sim_id}",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert del_res.status_code == 404  # Must fail with 404

        # 6. Verify simulation still exists for User A
        a_sims = client.get(
            "/api/user/simulations",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert any(s["id"] == sim_id for s in a_sims.json())

    def test_jwt_tampering_rejected(self):
        """Verify tokens with forged signatures or manipulated payload are rejected."""
        valid_token = create_access_token({"sub": "valid_user@terminal.ai"})

        # Tampered signature
        tampered_token = valid_token[:-6] + "xxxxxx"
        res = client.get(
            "/api/user/watchlist",
            headers={"Authorization": f"Bearer {tampered_token}"}
        )
        assert res.status_code == 401

        # Algorithm 'none' attack token
        none_token = jwt.encode({"sub": "attacker@terminal.ai"}, key="", algorithm="none")
        res_none = client.get(
            "/api/user/watchlist",
            headers={"Authorization": f"Bearer {none_token}"}
        )
        assert res_none.status_code == 401

    def test_predict_bounds_check(self):
        """Verify input validation rejects extreme negative, overflow, or NaN values."""
        # Negative issue size
        res_neg = client.post("/api/predict", json={
            "issue_size": -50.0,
            "offer_price": 250.0
        })
        assert res_neg.status_code == 422

        # Massive overflow issue size
        res_huge = client.post("/api/predict", json={
            "issue_size": 9999999999.0,
            "offer_price": 250.0
        })
        assert res_huge.status_code == 422

        # Negative subscription times
        res_sub = client.post("/api/predict", json={
            "issue_size": 500.0,
            "offer_price": 250.0,
            "qib": -10.0
        })
        assert res_sub.status_code == 422

    def test_companion_chat_length_limit(self):
        """Verify AI companion chat rejects excessively long payloads to prevent DoS."""
        huge_message = "X" * 3000
        res = client.post("/api/companion/chat", json={
            "message": huge_message
        })
        assert res.status_code == 422
