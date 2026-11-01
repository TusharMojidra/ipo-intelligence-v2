import pytest
from datetime import timedelta
import jwt
from backend.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    JWT_SECRET_KEY,
    JWT_ALGORITHM
)

def test_password_hashing_and_verification():
    raw_pass = "TerminalSecurePass#2026"
    hashed = hash_password(raw_pass)

    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword123", hashed) is False

def test_jwt_token_generation_and_decoding():
    sub = "user@terminal.ai"
    token = create_access_token({"sub": sub})
    payload = decode_access_token(token)

    assert payload is not None
    assert payload["sub"] == sub
    assert "exp" in payload

def test_jwt_token_expiration():
    sub = "expired@terminal.ai"
    # Token that expired 5 minutes ago
    token = create_access_token({"sub": sub}, expires_delta=timedelta(minutes=-5))
    payload = decode_access_token(token)
    assert payload is None

def test_invalid_jwt_signature():
    token = jwt.encode({"sub": "tampered@test.com"}, "wrong_secret_key_with_at_least_32_bytes_len", algorithm=JWT_ALGORITHM)
    payload = decode_access_token(token)
    assert payload is None
