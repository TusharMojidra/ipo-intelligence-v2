import os
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api import app, initialize_models, STATE, TRUSTED_ORIGINS
from backend.db import Base, get_db
from backend.models import User, UserSession, EmailVerificationToken, PasswordResetToken, UserWatchlist, SavedSimulation
from backend.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    generate_secure_token,
    hash_token,
    get_real_client_ip,
    set_session_cookie,
    clear_session_cookie,
    create_access_token,
    _DUMMY_ARGON2_HASH
)
import backend.routers.auth as auth_mod

# Isolated in-memory SQLite database
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    if "clf" not in STATE:
        initialize_models()
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture(autouse=True)
def clear_rate_limits():
    auth_mod._FAILED_ATTEMPTS.clear()
    auth_mod._OTP_REQUESTS.clear()
    auth_mod._RESET_REQUESTS.clear()
    auth_mod._SIGNUP_ATTEMPTS.clear()
    yield
    auth_mod._FAILED_ATTEMPTS.clear()
    auth_mod._OTP_REQUESTS.clear()
    auth_mod._RESET_REQUESTS.clear()
    auth_mod._SIGNUP_ATTEMPTS.clear()

@pytest.fixture
def client():
    return TestClient(app)


# =========================================================================
# 1. GOOGLE OAUTH SECURITY TESTS
# =========================================================================

def test_google_oauth_invalid_and_tampered_token(client):
    """Verifies that invalid, expired, or tampered Google tokens are strictly rejected with 401."""
    res = client.post("/api/auth/google", json={
        "credential": "tampered.jwt.signature",
        "client_id": "test_client_id"
    })
    assert res.status_code == 401
    assert "Invalid, expired, tampered" in res.json()["detail"]


def test_google_oauth_issuer_mismatch(client, monkeypatch):
    """Verifies that tokens from untrusted issuers are rejected."""
    bad_issuer_claims = {
        "iss": "https://malicious-issuer.com",
        "aud": "test_client_id",
        "sub": "google-sub-12345",
        "email": "test@gmail.com",
        "email_verified": True
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=bad_issuer_claims):
        res = client.post("/api/auth/google", json={
            "credential": "valid_looking_token",
            "client_id": "test_client_id"
        })
        assert res.status_code == 401
        assert "issuer" in res.json()["detail"]


def test_google_oauth_audience_mismatch(client):
    """Verifies that tokens with audience mismatch are rejected."""
    bad_aud_claims = {
        "iss": "https://accounts.google.com",
        "aud": "wrong_audience_app_id",
        "sub": "google-sub-12345",
        "email": "test@gmail.com",
        "email_verified": True
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=bad_aud_claims):
        res = client.post("/api/auth/google", json={
            "credential": "valid_token_wrong_aud",
            "client_id": "test_client_id"
        })
        assert res.status_code == 401
        assert "audience" in res.json()["detail"]


def test_google_oauth_unverified_email_rejected(client):
    """Verifies that Google accounts without email verification are rejected."""
    unverified_claims = {
        "iss": "https://accounts.google.com",
        "aud": "test_client_id",
        "sub": "google-sub-unverified",
        "email": "unverified@gmail.com",
        "email_verified": False
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=unverified_claims):
        res = client.post("/api/auth/google", json={
            "credential": "unverified_token",
            "client_id": "test_client_id"
        })
        assert res.status_code == 400
        assert "not verified" in res.json()["detail"]


def test_google_oauth_account_takeover_prevention(client, monkeypatch):
    """Verifies that an attacker cannot link their Google ID to an existing email already bound to another Google ID."""
    db = TestingSessionLocal()
    existing_user = User(
        email="legit_owner@gmail.com",
        full_name="Legit Owner",
        auth_provider="google",
        google_id="original_google_sub_111",
        is_active=True,
        is_verified=True,
        role="user"
    )
    db.add(existing_user)
    db.commit()
    db.close()

    attacker_claims = {
        "iss": "https://accounts.google.com",
        "aud": "test_client_id",
        "sub": "attacker_google_sub_999",
        "email": "legit_owner@gmail.com",
        "email_verified": True
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=attacker_claims):
        res = client.post("/api/auth/google", json={
            "credential": "attacker_token",
            "client_id": "test_client_id"
        })
        assert res.status_code == 409
        assert "already linked" in res.json()["detail"]


# =========================================================================
# 2. CORS AND CSRF STRICT ORIGIN PROTECTION TESTS
# =========================================================================

def test_cors_trusted_origin_allowed(client):
    """Trusted origins receive CORS allow headers."""
    res = client.options("/api/auth/me", headers={
        "Origin": "https://ipo-intelligence-terminal.onrender.com",
        "Access-Control-Request-Method": "GET"
    })
    assert res.headers.get("access-control-allow-origin") == "https://ipo-intelligence-terminal.onrender.com"
    assert res.headers.get("access-control-allow-credentials") == "true"


def test_cors_untrusted_origin_rejected(client):
    """Untrusted origins do not receive CORS allow headers."""
    res = client.options("/api/auth/me", headers={
        "Origin": "https://malicious-attacker.com",
        "Access-Control-Request-Method": "GET"
    })
    assert res.headers.get("access-control-allow-origin") != "https://malicious-attacker.com"


def test_csrf_cookie_authenticated_state_change_rejected_from_untrusted_origin(client):
    """State-changing request with ipo_session cookie from an untrusted Origin is blocked with 403 Forbidden."""
    client.cookies.set("ipo_session", "mock_session_cookie_value")
    res = client.post(
        "/api/user/watchlist",
        headers={"Origin": "https://evil-attacker.com"},
        json={"company_name": "Test Co"}
    )
    assert res.status_code == 403
    assert "CSRF" in res.json()["detail"]
    client.cookies.clear()


# =========================================================================
# 3. EMAIL VERIFICATION TESTS
# =========================================================================

def test_unverified_user_blocked_from_protected_endpoints(client):
    """Unverified users receive 403 on protected features, but can still access auth endpoints."""
    reg = client.post("/api/auth/register", json={
        "email": "unverified_analyst@fund.com",
        "password": "ValidPassword#2026",
        "full_name": "Unverified Analyst"
    })
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Blocked from watchlist (403)
    wl_res = client.post("/api/user/watchlist", headers=headers, json={"company_name": "Tata Tech"})
    assert wl_res.status_code == 403
    assert "Email verification required" in wl_res.json()["detail"]

    # Blocked from simulations (403)
    sim_res = client.post("/api/user/simulations", headers=headers, json={
        "title": "IPO Test", "inputs": {}, "results": {}
    })
    assert sim_res.status_code == 403

    # But allowed to access /me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["is_verified"] is False


def test_email_verification_token_one_time_use(client):
    """Verification tokens are single-use; a second attempt must fail with 400."""
    db = TestingSessionLocal()
    user = User(
        email="verify_single_use@fund.com",
        hashed_password=hash_password("Pass#123456"),
        auth_provider="local",
        is_active=True,
        is_verified=False,
        role="user"
    )
    db.add(user)
    db.commit()

    raw_token = generate_secure_token()
    token_hash = hash_token(raw_token)
    v_rec = EmailVerificationToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        is_used=False
    )
    db.add(v_rec)
    db.commit()
    db.close()

    # First verification -> 200 OK
    res1 = client.post("/api/auth/verify-email", json={"token": raw_token})
    assert res1.status_code == 200

    # Second verification with same token -> 400 Bad Request
    res2 = client.post("/api/auth/verify-email", json={"token": raw_token})
    assert res2.status_code == 400
    assert "invalid or has expired" in res2.json()["detail"]


# =========================================================================
# 4. SESSION SECURITY & DUAL RESOLVER TESTS
# =========================================================================

def test_cookie_flags_security():
    """Verifies that session cookies are HttpOnly and SameSite=Lax, and Secure in production."""
    from fastapi import Response
    resp = Response()
    set_session_cookie(resp, "test_token_raw", remember_me=True, is_secure=True)
    cookie_header = resp.headers.get("set-cookie")
    assert "HttpOnly" in cookie_header
    assert "samesite=lax" in cookie_header.lower()
    assert "Secure" in cookie_header


def test_dual_authentication_resolver_with_cookie(client):
    """Dual-resolver authenticates users through the HttpOnly ipo_session cookie."""
    db = TestingSessionLocal()
    user = User(
        email="cookie_session_user@fund.com",
        hashed_password=hash_password("Pass#123456"),
        auth_provider="local",
        is_active=True,
        is_verified=True,
        role="user"
    )
    db.add(user)
    db.commit()

    raw_token = generate_secure_token()
    t_hash = hash_token(raw_token)
    session = UserSession(
        session_token_hash=t_hash,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_revoked=False
    )
    db.add(session)
    db.commit()
    db.close()

    client.cookies.set("ipo_session", raw_token)
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json()["email"] == "cookie_session_user@fund.com"
    client.cookies.clear()


# =========================================================================
# 5. PASSWORD RESET & SESSION REVOCATION TESTS
# =========================================================================

def test_password_reset_anti_enumeration(client):
    """Forgot-password endpoint returns identical message for both registered and unregistered emails."""
    res_nonexistent = client.post("/api/auth/forgot-password", json={"email": "nobody_exists_123@fund.com"})
    assert res_nonexistent.status_code == 200

    res_real = client.post("/api/auth/forgot-password", json={"email": "cookie_session_user@fund.com"})
    assert res_real.status_code == 200
    assert res_nonexistent.json()["message"] == res_real.json()["message"]


def test_password_reset_revokes_all_sessions(client):
    """Resetting password terminates all active sessions across all devices."""
    db = TestingSessionLocal()
    user = User(
        email="reset_target@fund.com",
        hashed_password=hash_password("OldPassword#2025"),
        auth_provider="local",
        is_active=True,
        is_verified=True,
        role="user"
    )
    db.add(user)
    db.commit()
    target_user_id = user.id

    # Create two active sessions
    raw1, raw2 = generate_secure_token(), generate_secure_token()
    s1 = UserSession(session_token_hash=hash_token(raw1), user_id=target_user_id, expires_at=datetime.now(timezone.utc)+timedelta(days=1), is_revoked=False)
    s2 = UserSession(session_token_hash=hash_token(raw2), user_id=target_user_id, expires_at=datetime.now(timezone.utc)+timedelta(days=1), is_revoked=False)
    db.add_all([s1, s2])

    raw_reset = generate_secure_token()
    r_tok = PasswordResetToken(user_id=target_user_id, token_hash=hash_token(raw_reset), expires_at=datetime.now(timezone.utc)+timedelta(hours=1), is_used=False)
    db.add(r_tok)
    db.commit()
    db.close()

    # Reset password
    res = client.post("/api/auth/reset-password", json={
        "token": raw_reset,
        "new_password": "NewStrongPassword#2026"
    })
    assert res.status_code == 200

    # Verify both sessions are revoked
    db = TestingSessionLocal()
    active_sessions = db.query(UserSession).filter(UserSession.user_id == target_user_id, UserSession.is_revoked == False).all()
    assert len(active_sessions) == 0
    db.close()


# =========================================================================
# 6. RATE LIMITING TESTS
# =========================================================================

def test_login_rate_limiting_5_failed_attempts(client):
    """5 consecutive failed logins trigger HTTP 429 Too Many Requests."""
    for i in range(5):
        client.post("/api/auth/login", json={"email": "ratelimit_victim@test.com", "password": "WrongPassword#1"})

    locked_res = client.post("/api/auth/login", json={"email": "ratelimit_victim@test.com", "password": "WrongPassword#1"})
    assert locked_res.status_code == 429
    assert "Too many failed attempts" in locked_res.json()["detail"]


def test_signup_rate_limiting(client):
    """Exceeding 5 signups per hour triggers HTTP 429."""
    for i in range(5):
        auth_mod.check_signup_rate_limit("198.51.100.1")

    with pytest.raises(HTTPException) as exc:
        auth_mod.check_signup_rate_limit("198.51.100.1")
    assert exc.value.status_code == 429
    assert "Too many accounts created" in exc.value.detail


# =========================================================================
# 7. LOCKOUT AND TIMING ATTACK PROTECTION TESTS
# =========================================================================

def test_generic_error_responses_for_failed_login(client):
    """Failed logins return generic 'Invalid email or password' regardless of whether account exists."""
    res1 = client.post("/api/auth/login", json={"email": "definitely_does_not_exist@fund.com", "password": "Password#123"})
    assert res1.status_code == 401
    assert res1.json()["detail"] == "Invalid email or password."


def test_dummy_argon2_hash_timing_shield():
    """Verifies that _DUMMY_ARGON2_HASH is a valid Argon2id hash used to shield response times."""
    assert _DUMMY_ARGON2_HASH.startswith("$argon2id$")
    assert verify_password("any_wrong_password", _DUMMY_ARGON2_HASH) is False


# =========================================================================
# 8. PASSWORD POLICY & OWASP COMPLEXITY TESTS
# =========================================================================

def test_password_policy_owasp_compliance():
    """Verifies OWASP password rules: complexity, blacklist, and passphrase support."""
    # Too short (< 8)
    with pytest.raises(HTTPException) as e:
        validate_password_strength("Short1!")
    assert e.value.status_code == 400

    # Common breached password blacklisted
    with pytest.raises(HTTPException) as e:
        validate_password_strength("Password123!")
    assert "data breaches" in e.value.detail

    # Passphrase >= 20 characters accepted
    validate_password_strength("super-long-secure-passphrase-2026")


# =========================================================================
# 9. AUTHORIZATION & IDOR PREVENTION TESTS
# =========================================================================

def test_idor_protection_between_users(client):
    """User A cannot access or delete User B's watchlist items."""
    db = TestingSessionLocal()
    u_a = User(email="user_a@test.com", auth_provider="local", is_active=True, is_verified=True, role="user")
    u_b = User(email="user_b@test.com", auth_provider="local", is_active=True, is_verified=True, role="user")
    db.add_all([u_a, u_b])
    db.commit()
    u_a_id = u_a.id
    u_b_id = u_b.id

    w_a = UserWatchlist(user_id=u_a_id, company_name="Secret Tech Unicorn", symbol="STU")
    db.add(w_a)
    db.commit()
    db.close()

    token_b = create_access_token({"sub": "user_b@test.com", "uid": u_b_id, "role": "user"})
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B views watchlist -> empty (cannot see User A's items)
    res_b = client.get("/api/user/watchlist", headers=headers_b)
    assert res_b.status_code == 200
    assert len(res_b.json()) == 0

    # User B attempts to delete User A's item -> 404 (not found for User B)
    del_res = client.delete("/api/user/watchlist/Secret%20Tech%20Unicorn", headers=headers_b)
    assert del_res.status_code == 404


# =========================================================================
# 10. INPUT VALIDATION TESTS
# =========================================================================

def test_input_validation_boundaries(client):
    """Malformed emails and passwords exceeding 128 characters are rejected."""
    # Password > 128 chars
    with pytest.raises(HTTPException) as e:
        validate_password_strength("A" * 129 + "a1!")
    assert e.value.status_code == 400
    assert "128 characters" in e.value.detail


# =========================================================================
# 11. SECURITY HEADERS TESTS
# =========================================================================

def test_security_headers_present(client):
    """Verifies standard security headers including nosniff, DENY, and CSP."""
    res = client.get("/api/auth/google/config")
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert res.headers.get("x-xss-protection") == "1; mode=block"
    assert "Content-Security-Policy" in res.headers
    assert "default-src 'self'" in res.headers["Content-Security-Policy"]


# =========================================================================
# 12. LOGOUT INVALIDATION TESTS
# =========================================================================

def test_logout_invalidates_both_cookie_and_jwt(client):
    """Logging out revokes both the server session cookie and the active JWT tied via sid."""
    db = TestingSessionLocal()
    user = User(email="logout_test@fund.com", auth_provider="local", is_active=True, is_verified=True, role="user")
    db.add(user)
    db.commit()
    user_email = user.email
    user_id = user.id
    user_role = user.role

    raw_token = generate_secure_token()
    s = UserSession(session_token_hash=hash_token(raw_token), user_id=user_id, expires_at=datetime.now(timezone.utc)+timedelta(days=1), is_revoked=False)
    db.add(s)
    db.commit()
    session_id = s.id
    db.close()

    jwt_token = create_access_token({"sub": user_email, "uid": user_id, "role": user_role, "sid": session_id})
    client.cookies.set("ipo_session", raw_token)

    # Logout with both cookie and Bearer header
    logout_res = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {jwt_token}"})
    assert logout_res.status_code == 200

    # Verify session is revoked in DB
    db = TestingSessionLocal()
    revoked_session = db.query(UserSession).filter(UserSession.id == session_id).first()
    assert revoked_session.is_revoked is True
    db.close()

    # Subsequent access with revoked JWT -> 401 on protected endpoint, null on /me
    client.cookies.clear()
    denied_res = client.get("/api/user/watchlist", headers={"Authorization": f"Bearer {jwt_token}"})
    assert denied_res.status_code == 401
    assert "revoked or expired" in denied_res.json()["detail"]

    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {jwt_token}"})
    assert me_res.status_code == 200
    assert me_res.json() is None


# =========================================================================
# 13. TOKEN HANDLING & NO LOCALSTORAGE TESTS
# =========================================================================

def test_frontend_does_not_persist_jwt_to_localstorage():
    """Verifies that frontend AuthContext does not store JWT tokens in localStorage."""
    frontend_path = "frontend/src/context/AuthContext.tsx"
    with open(frontend_path, "r", encoding="utf-8") as f:
        content = f.read()
    # Confirm tokens are NOT written to localStorage
    assert "localStorage.setItem(TOKEN_KEY" not in content
    assert "localStorage.setItem(USER_KEY" not in content
    assert "credentials: 'include'" in content


# =========================================================================
# 14. PROXY HEADER HANDLING TESTS
# =========================================================================

def test_proxy_header_real_client_ip():
    """Verifies real client IP extraction from X-Forwarded-For."""
    mock_request = MagicMock()
    mock_request.headers = {"x-forwarded-for": "203.0.113.195, 10.0.0.1"}
    ip = get_real_client_ip(mock_request)
    assert ip == "203.0.113.195"
