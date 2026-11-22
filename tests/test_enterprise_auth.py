import pytest
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.db import SessionLocal
from backend.models import User, UserSession, EmailVerificationToken, PasswordResetToken
from backend.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    generate_secure_token,
    hash_token,
)
from backend.routers.auth import _FAILED_ATTEMPTS, _OTP_REQUESTS, _RESET_REQUESTS, _SIGNUP_ATTEMPTS
from api import app, initialize_models

@pytest.fixture(scope="module")
def client():
    initialize_models()
    with TestClient(app) as c:
        yield c

@pytest.fixture(autouse=True)
def reset_rate_limits(client):
    client.cookies.clear()
    _FAILED_ATTEMPTS.clear()
    _OTP_REQUESTS.clear()
    _RESET_REQUESTS.clear()
    _SIGNUP_ATTEMPTS.clear()
    yield
    client.cookies.clear()
    _FAILED_ATTEMPTS.clear()
    _OTP_REQUESTS.clear()
    _RESET_REQUESTS.clear()
    _SIGNUP_ATTEMPTS.clear()

def test_password_strength_enforcement():
    # 1. Less than 8 chars
    with pytest.raises(HTTPException) as exc:
        validate_password_strength("Short1!")
    assert exc.value.status_code == 400
    assert "8 characters" in exc.value.detail

    # 2. No uppercase
    with pytest.raises(HTTPException) as exc:
        validate_password_strength("lowercase123!")
    assert exc.value.status_code == 400
    assert "uppercase" in exc.value.detail

    # 3. No lowercase
    with pytest.raises(HTTPException) as exc:
        validate_password_strength("UPPERCASE123!")
    assert exc.value.status_code == 400
    assert "lowercase" in exc.value.detail

    # 4. No number
    with pytest.raises(HTTPException) as exc:
        validate_password_strength("NoNumbersHere!")
    assert exc.value.status_code == 400
    assert "number" in exc.value.detail

    # 5. No special char
    with pytest.raises(HTTPException) as exc:
        validate_password_strength("NoSpecialChar123")
    assert exc.value.status_code == 400
    assert "special character" in exc.value.detail

    # 6. Valid password should not raise
    validate_password_strength("StrongPass#2026")

def test_argon2id_hashing():
    raw = "StrongPassword@999"
    hashed = hash_password(raw)
    assert hashed.startswith("$argon2id$")
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword@999", hashed) is False

def test_full_registration_email_verification_flow(client):
    email = "audit_verify@fund.com"
    password = "AuditPassword#2026"

    # Clean existing user if present
    db = SessionLocal()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == existing.id).delete()
        db.delete(existing)
        db.commit()
    db.close()

    # 1. Register user
    res = client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Audit User"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["user"]["email"] == email
    assert data["user"]["is_verified"] is False

    # Check database token
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    assert user is not None
    assert user.is_verified is False

    v_token = db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user.id).first()
    assert v_token is not None
    assert v_token.is_used is False
    db.close()

    # 2. Verification with invalid token -> 400
    res_bad = client.post("/api/auth/verify-email", json={"token": "invalid_fake_token"})
    assert res_bad.status_code == 400

    # 3. Verification with valid raw token
    db = SessionLocal()
    raw_tok = generate_secure_token()
    hashed_tok = hash_token(raw_tok)
    token_obj = EmailVerificationToken(
        user_id=user.id,
        token_hash=hashed_tok,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        is_used=False
    )
    db.add(token_obj)
    db.commit()
    db.close()

    res_good = client.post("/api/auth/verify-email", json={"token": raw_tok})
    assert res_good.status_code == 200
    assert "verified successfully" in res_good.json()["message"].lower()

    # Check user is now verified in DB
    db = SessionLocal()
    u_updated = db.query(User).filter(User.email == email).first()
    assert u_updated.is_verified is True

    # Re-use of token should fail
    res_reuse = client.post("/api/auth/verify-email", json={"token": raw_tok})
    assert res_reuse.status_code == 400
    db.close()

def test_login_rate_limiting_and_generic_errors(client):
    email = "victim@fund.com"
    password = "CorrectPass#2026"

    # Clean existing
    db = SessionLocal()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        db.delete(existing)
        db.commit()
    db.close()

    # Register user
    reg = client.post("/api/auth/register", json={"email": email, "password": password})
    assert reg.status_code == 201
    client.cookies.clear()

    # Attempt wrong password 5 times
    for i in range(5):
        r = client.post("/api/auth/login", json={"email": email, "password": "WrongPassword#999"})
        assert r.status_code in (401, 429)
        assert "Invalid email or password" in r.json()["detail"] or "locked" in r.json()["detail"]

    # 6th attempt -> Account locked or rate limited (never returns 200)
    locked_res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert locked_res.status_code in (401, 429)

def test_password_reset_and_session_invalidation(client):
    email = "reset_user@fund.com"
    password = "OldPassword#2026"
    new_password = "NewPassword#2027!"

    # Clean existing
    db = SessionLocal()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == existing.id).delete()
        db.delete(existing)
        db.commit()
    db.close()

    # 1. Register & login
    reg = client.post("/api/auth/register", json={"email": email, "password": password})
    assert reg.status_code == 201

    login_res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    old_jwt = login_res.json()["access_token"]

    # Verify old session works
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_jwt}"})
    assert me_res.status_code == 200

    # 2. Request forgot password
    forgot_res = client.post("/api/auth/forgot-password", json={"email": email})
    assert forgot_res.status_code == 200

    # Anti-enumeration: requesting for nonexistent email gives identical response
    fake_res = client.post("/api/auth/forgot-password", json={"email": "nonexistent@fake.com"})
    assert fake_res.status_code == 200
    assert fake_res.json()["message"] == forgot_res.json()["message"]

    # Retrieve reset token from DB
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    raw_reset = generate_secure_token()
    hashed_reset = hash_token(raw_reset)
    reset_entry = PasswordResetToken(
        user_id=user.id,
        token_hash=hashed_reset,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        is_used=False
    )
    db.add(reset_entry)
    db.commit()
    db.close()

    # 3. Reset password
    reset_call = client.post("/api/auth/reset-password", json={
        "token": raw_reset,
        "new_password": new_password
    })
    assert reset_call.status_code == 200

    # 4. Old JWT must now be rejected because password changed
    client.cookies.clear()
    wl_denied = client.get("/api/user/watchlist", headers={"Authorization": f"Bearer {old_jwt}"})
    assert wl_denied.status_code == 401
    assert "Session" in wl_denied.json()["detail"] and "expired" in wl_denied.json()["detail"]

    old_jwt_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_jwt}"})
    assert old_jwt_res.status_code == 200
    assert old_jwt_res.json() is None

    # 5. Login with new password works
    new_login = client.post("/api/auth/login", json={"email": email, "password": new_password})
    assert new_login.status_code == 200
