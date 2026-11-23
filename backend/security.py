import os
import re
import hmac
import hashlib
import secrets
import logging
import ipaddress
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import bcrypt
from argon2 import PasswordHasher, Type
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHash
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models import User, UserSession

load_dotenv()

logger = logging.getLogger("security")

DEFAULT_DEV_KEY = "dev_secret_key_change_in_production_1234567890"
ENV_MODE = os.getenv("ENVIRONMENT", "development").lower()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", DEFAULT_DEV_KEY)
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# Production Guard: Strict refusal of default or weak keys in production
if ENV_MODE == "production":
    if not JWT_SECRET_KEY or JWT_SECRET_KEY == DEFAULT_DEV_KEY or len(JWT_SECRET_KEY) < 32:
        raise RuntimeError(
            "FATAL SECURITY CONFIGURATION: In production, JWT_SECRET_KEY must be explicitly set "
            "and must contain at least 32 cryptographically secure characters."
        )
elif JWT_SECRET_KEY == DEFAULT_DEV_KEY:
    logger.warning("SECURITY WARNING: Using default dev JWT secret key. Do not use in production.")

security_bearer = HTTPBearer(auto_error=False)

# OWASP Recommended Argon2id parameters (2025–2026):
# m=64MB (65536 KiB), t=3 iterations, p=4 parallelism, hash_len=32 bytes
_argon2_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    type=Type.ID
)

# Precomputed Argon2id hash for constant-time dummy verification on nonexistent accounts
_DUMMY_ARGON2_HASH = _argon2_hasher.hash("DummySecurePasswordForTimingMitigation#2026!")

# Common breached/weak passwords blacklist
COMMON_BREACHED_PASSWORDS = {
    "password123!", "password@123", "admin12345!", "welcome123!", "qwerty12345!",
    "iloveyou123!", "12345678aa!", "testpass123!", "letmein1234!", "passphrase123!"
}

# Password policy regex: min 8, max 128 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special symbol
PASSWORD_POLICY_REGEX = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]).{8,128}$"
)


RFC_PRIVATE_NETWORKS = (
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
)


def _is_internal_ip(ip_str: str, trusted_proxies: set) -> bool:
    if ip_str in trusted_proxies:
        return True
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in net for net in RFC_PRIVATE_NETWORKS)
    except ValueError:
        return False


def get_real_client_ip(request: Request) -> str:
    """
    Safely resolves the true client IP:
    1. If request is behind a reverse proxy, inspects X-Forwarded-For from right to left
       to find the first non-proxy hop (the hop appended by the reverse proxy).
    2. If direct connection (non-internal, non-proxy), strictly trusts request.client.host
       and rejects client-supplied X-Forwarded-For to prevent IP spoofing and rate limit bypass.
    3. Falls back to request.client.host or '127.0.0.1'.
    """
    trusted_raw = os.getenv("FORWARDED_ALLOW_IPS", "127.0.0.1,::1,localhost")
    trusted_proxies = set(ip.strip() for ip in trusted_raw.split(",") if ip.strip())
    raw_host = getattr(getattr(request, "client", None), "host", None)
    client_host = raw_host if isinstance(raw_host, str) else None

    # If direct connection from an external IP, ignore XFF header to prevent client spoofing
    if client_host and client_host not in trusted_proxies and not _is_internal_ip(client_host, trusted_proxies) and client_host != "testclient":
        return client_host

    forwarded = request.headers.get("x-forwarded-for") if (request and hasattr(request, "headers")) else None
    if forwarded:
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        # Walk backwards from right to left to find proxy-appended hop
        for p in reversed(parts):
            if re.match(r"^[\da-fA-F.:]+$", p):
                if not _is_internal_ip(p, trusted_proxies):
                    return p
        # If all hops are internal, take the rightmost valid format IP
        for p in reversed(parts):
            if re.match(r"^[\da-fA-F.:]+$", p):
                return p

    if client_host:
        return client_host
    return "127.0.0.1"


def validate_password_strength(password: str) -> None:
    """
    Enforce modern OWASP password policy:
    - Minimum 8 characters, maximum 128 (guards against ReDoS/hashing CPU DoS)
    - Rejects common breached passwords
    - Supports passphrases (>=20 characters with multi-character diversity)
    - For 8-19 chars: requires uppercase, lowercase, digit, and special symbol
    """
    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required."
        )
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )
    if len(password) > 128:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password cannot exceed 128 characters."
        )
    if password.lower() in COMMON_BREACHED_PASSWORDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password appears in known data breaches or is too common. Please choose a more unique password."
        )

    # For long passphrases (>=20 characters), require at least 2 character categories
    if len(password) >= 20:
        categories = 0
        if re.search(r"[a-z]", password): categories += 1
        if re.search(r"[A-Z]", password): categories += 1
        if re.search(r"\d", password): categories += 1
        if re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/? ]", password): categories += 1
        if categories < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passphrase must contain at least two different character types (letters, numbers, or symbols)."
            )
        return

    # Standard 8-19 char policy
    if not PASSWORD_POLICY_REGEX.match(password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
        )


def hash_password(password: str) -> str:
    """
    Hash a plaintext password using Argon2id (OWASP recommended standard).
    Guards against ReDoS / CPU-exhaustion DoS by enforcing 128-byte limit.
    """
    validate_password_strength(password)
    return _argon2_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against an Argon2id hash (with backward compatibility
    for legacy bcrypt hashes). Uses constant-time checks.
    """
    if not plain_password or not hashed_password:
        return False
    if len(plain_password.encode("utf-8")) > 128:
        return False

    # 1. Argon2id check (begins with $argon2id$)
    if hashed_password.startswith("$argon2id$") or hashed_password.startswith("$argon2"):
        try:
            return _argon2_hasher.verify(hashed_password, plain_password)
        except (VerifyMismatchError, VerificationError, InvalidHash):
            return False
        except Exception:
            return False

    # 2. Backward compatibility for legacy bcrypt hashes (starts with $2b$ or $2a$)
    if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
        try:
            pw_bytes = plain_password.encode("utf-8")
            return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
        except Exception:
            return False

    return False


def generate_secure_token() -> str:
    """Generates a cryptographically secure 256-bit URL-safe token."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Computes a SHA-256 hex digest of a token for secure database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_token_constant_time(token: str, expected_hash: str) -> bool:
    """Verifies a raw token against a stored SHA-256 hash in constant time to prevent timing attacks."""
    actual_hash = hash_token(token)
    return hmac.compare_digest(actual_hash, expected_hash)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a cryptographically signed JWT access token."""
    import jwt
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and cryptographically validate a JWT access token, enforcing algorithm."""
    import jwt
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "sub"]}
        )
        return payload
    except jwt.PyJWTError:
        return None


def create_user_session(
    db: Session,
    user_id: int,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    remember_me: bool = False
) -> Tuple[str, UserSession]:
    """
    Creates an opaque, cryptographically random session token, hashes it for DB storage,
    and returns both the raw token (to be sent via HttpOnly cookie) and the session record.
    """
    raw_token = generate_secure_token()
    token_hash = hash_token(raw_token)
    now = datetime.now(timezone.utc)
    # 7 days for remember me, 24 hours otherwise
    duration = timedelta(days=7) if remember_me else timedelta(days=1)
    expires_at = now + duration

    session = UserSession(
        session_token_hash=token_hash,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent[:255] if user_agent else None,
        expires_at=expires_at,
        is_revoked=False,
        last_active_at=now,
        created_at=now
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return raw_token, session


def set_session_cookie(
    response: Response, 
    raw_token: str, 
    remember_me: bool = False,
    is_secure: Optional[bool] = None
) -> None:
    """Sets a hardened HttpOnly cookie on the response."""
    max_age = 7 * 86400 if remember_me else 86400
    secure_flag = True if (ENV_MODE == "production" or is_secure is True) else False
    response.set_cookie(
        key="ipo_session",
        value=raw_token,
        max_age=max_age,
        expires=max_age,
        httponly=True,
        samesite="lax",
        secure=secure_flag,
        path="/"
    )


def clear_session_cookie(response: Response, is_secure: Optional[bool] = None) -> None:
    """Deletes the HttpOnly session cookie."""
    secure_flag = True if (ENV_MODE == "production" or is_secure is True) else False
    response.delete_cookie(
        key="ipo_session",
        httponly=True,
        samesite="lax",
        secure=secure_flag,
        path="/"
    )


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """
    Dual authentication resolver:
    1. Checks session cookie 'ipo_session' in DB (primary browser revocable session)
    2. Falls back to Authorization: Bearer <JWT> for API/mobile clients
       (validates revocation via DB session ID 'sid' or 'password_changed_at')
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    now = datetime.now(timezone.utc)

    # 1. Try session cookie first
    session_cookie = request.cookies.get("ipo_session")
    if session_cookie:
        token_hash = hash_token(session_cookie)
        session = db.query(UserSession).filter(
            UserSession.session_token_hash == token_hash,
            UserSession.is_revoked == False,
            UserSession.expires_at > now
        ).first()

        if session and session.user and session.user.is_active:
            session.last_active_at = now
            db.commit()
            return session.user

    # 2. Try Bearer JWT token
    if credentials and credentials.credentials:
        payload = decode_access_token(credentials.credentials)
        if payload:
            email: Optional[str] = payload.get("sub")
            sid: Optional[int] = payload.get("sid")
            if email:
                user = db.query(User).filter(User.email == email).first()
                if user and user.is_active:
                    # If token is linked to a server session, verify revocation
                    if sid is not None:
                        session_record = db.query(UserSession).filter(
                            UserSession.id == sid,
                            UserSession.user_id == user.id,
                            UserSession.is_revoked == False,
                            UserSession.expires_at > now
                        ).first()
                        if not session_record:
                            raise HTTPException(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Session has been revoked or expired. Please log in again."
                            )

                    # Check if token was issued before password change
                    iat = payload.get("iat")
                    if user.password_changed_at and iat:
                        pwd_changed_dt = user.password_changed_at
                        if pwd_changed_dt.tzinfo is None:
                            pwd_changed_dt = pwd_changed_dt.replace(tzinfo=timezone.utc)
                        pwd_changed_ts = pwd_changed_dt.timestamp()
                        if iat <= pwd_changed_ts:
                            raise HTTPException(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Session expired due to recent password change. Please log in again."
                            )
                    return user

    raise credentials_exception


def get_verified_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Enforces that the authenticated user has verified their email address.
    Unverified accounts receive HTTP 403 Forbidden on protected features.
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required. Please verify your email address to access this feature."
        )
    return current_user


def get_admin_user(
    current_user: User = Depends(get_verified_user)
) -> User:
    """
    Enforces that the authenticated, verified user has admin privileges.
    Non-admin accounts receive HTTP 403 Forbidden.
    """
    if getattr(current_user, "role", "user") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required."
        )
    return current_user


def get_optional_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Return User if valid session or token present, otherwise None."""
    try:
        return get_current_user(request, credentials, db)
    except HTTPException:
        return None
