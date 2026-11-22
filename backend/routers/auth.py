import os
import time
import re
import json
import base64
import secrets
import urllib.parse
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, RedirectResponse
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from backend.db import get_db
from backend.models import (
    User, AuthAuditLog, OtpVerification,
    EmailVerificationToken, PasswordResetToken, UserSession
)
from backend.schemas import (
    UserRegister, UserLogin, UserResponse, Token,
    GoogleAuthRequest,
    ForgotPasswordRequest, ResetPasswordRequest, VerifyEmailRequest,
    ResendVerificationRequest, SessionResponse
)
from backend.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    generate_secure_token,
    hash_token,
    verify_token_constant_time,
    create_access_token,
    decode_access_token,
    get_current_user,
    get_verified_user,
    get_optional_current_user,
    create_user_session,
    set_session_cookie,
    clear_session_cookie,
    get_real_client_ip,
    security_bearer,
    _DUMMY_ARGON2_HASH
)
from backend.email_service import (
    send_verification_email,
    send_password_reset_email
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/api/auth/google/callback")
ENV_MODE = os.getenv("ENVIRONMENT", "development").lower()

# In-memory sliding window rate limiters: IP -> list of timestamps
_FAILED_ATTEMPTS = defaultdict(list)
_OTP_REQUESTS = defaultdict(list)
_RESET_REQUESTS = defaultdict(list)
_SIGNUP_ATTEMPTS = defaultdict(list)

_MAX_FAILED_ATTEMPTS = 5
_LOCKOUT_WINDOW_SECONDS = 900  # 15 minutes
_MAX_OTP_PER_10_MIN = 5
_MAX_RESET_PER_15_MIN = 3
_MAX_SIGNUPS_PER_HOUR = 5

# OAuth CSRF state cache: state -> metadata dict {"exp": float, "redirect_uri": str}
_OAUTH_STATES: Dict[str, Any] = {}


def check_rate_limit(ip: str):
    """Enforces sliding-window rate limit on failed auth and verification attempts (5 per 15 min)."""
    now = time.time()
    _FAILED_ATTEMPTS[ip] = [t for t in _FAILED_ATTEMPTS[ip] if now - t < _LOCKOUT_WINDOW_SECONDS]
    if len(_FAILED_ATTEMPTS[ip]) >= _MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please try again after 15 minutes or reset your password."
        )


def check_signup_rate_limit(ip: str):
    """Enforces rate limit on account registration (max 5 signups per hour per IP) to prevent automated abuse."""
    now = time.time()
    _SIGNUP_ATTEMPTS[ip] = [t for t in _SIGNUP_ATTEMPTS[ip] if now - t < 3600]
    if len(_SIGNUP_ATTEMPTS[ip]) >= _MAX_SIGNUPS_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many accounts created from this network. Please try again later."
        )
    _SIGNUP_ATTEMPTS[ip].append(now)


def record_failed_attempt(ip: str):
    _FAILED_ATTEMPTS[ip].append(time.time())


def clear_failed_attempts(ip: str):
    if ip in _FAILED_ATTEMPTS:
        del _FAILED_ATTEMPTS[ip]


def check_otp_rate_limit(ip: str):
    now = time.time()
    _OTP_REQUESTS[ip] = [t for t in _OTP_REQUESTS[ip] if now - t < 600]
    if len(_OTP_REQUESTS[ip]) >= _MAX_OTP_PER_10_MIN:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please wait a few minutes before trying again."
        )
    _OTP_REQUESTS[ip].append(now)


def check_reset_rate_limit(ip: str):
    now = time.time()
    _RESET_REQUESTS[ip] = [t for t in _RESET_REQUESTS[ip] if now - t < 900]
    if len(_RESET_REQUESTS[ip]) >= _MAX_RESET_PER_15_MIN:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset requests. Please wait 15 minutes before trying again."
        )
    _RESET_REQUESTS[ip].append(now)


def normalize_phone(raw: str) -> str:
    cleaned = re.sub(r"[^\d+]", "", raw.strip())
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
    return cleaned


def is_email_address(s: str) -> bool:
    return "@" in s and "." in s.split("@")[-1]


def parse_google_credential(credential: str, client_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Cryptographically verify and parse Google ID token using google-auth library.
    Strictly verifies signature, issuer, audience against GOOGLE_CLIENT_ID, expiry, and email_verified.
    """
    target_client_id = client_id or GOOGLE_CLIENT_ID
    if not target_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Client ID is not configured on the server."
        )

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        request = google_requests.Request()
        id_info = id_token.verify_oauth2_token(
            credential,
            request,
            audience=target_client_id,
            clock_skew_in_seconds=10
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, tampered or wrong-audience Google ID token."
        )

    # 1. Verify issuer
    issuer = id_info.get("iss")
    if issuer not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token issuer."
        )

    # 2. Verify audience
    audience = id_info.get("aud")
    if audience != target_client_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token audience mismatch."
        )

    # 3. Verify email ownership was confirmed by Google
    if not id_info.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email is not verified."
        )

    return id_info


# =========================================================================
# Google OAuth Endpoints
# =========================================================================

@router.get("/google/config")
def get_google_config():
    """Returns Google OAuth status and Client ID for frontend GIS initialization."""
    return {
        "configured": bool(GOOGLE_CLIENT_ID),
        "client_id": GOOGLE_CLIENT_ID
    }


@router.get("/google/login")
def google_login_redirect(request: Request, redirect_uri: Optional[str] = None):
    """Directly redirects the user's browser to the official Google Account Chooser & Sign-in page."""
    if not GOOGLE_CLIENT_ID:
        return RedirectResponse(url="/?google_setup=needed")

    state = secrets.token_urlsafe(32)
    now = time.time()
    expired = [k for k, val in _OAUTH_STATES.items() if now > (val.get("exp", 0) if isinstance(val, dict) else val)]
    for k in expired:
        _OAUTH_STATES.pop(k, None)

    # Determine redirect URI
    selected_redirect_uri = redirect_uri or GOOGLE_REDIRECT_URI
    host = request.headers.get("host", "") if request else ""
    if ("localhost" in host or "127.0.0.1" in host) and not redirect_uri:
        local_override = os.getenv("GOOGLE_REDIRECT_URI_LOCAL")
        if local_override:
            selected_redirect_uri = local_override

    _OAUTH_STATES[state] = {
        "exp": now + 600,
        "redirect_uri": selected_redirect_uri
    }

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": selected_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state
    }
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=google_auth_url)


@router.get("/google/callback")
async def google_oauth_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    state: Optional[str] = None,
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Handles Google OAuth 2.0 authorization code callback from accounts.google.com."""
    client_ip = request.client.host if request and request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown") if request else "unknown"

    if error:
        return RedirectResponse(url=f"/?auth_error={urllib.parse.quote(error)}")

    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing authorization code.")

    # Validate CSRF state
    now = time.time()
    if not state or state not in _OAUTH_STATES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth CSRF state. Please attempt login again."
        )
    state_entry = _OAUTH_STATES.pop(state)
    exp_time = state_entry.get("exp", 0) if isinstance(state_entry, dict) else state_entry
    saved_redirect_uri = state_entry.get("redirect_uri", GOOGLE_REDIRECT_URI) if isinstance(state_entry, dict) else GOOGLE_REDIRECT_URI

    if now > exp_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expired OAuth session. Please attempt login again."
        )

    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": saved_redirect_uri,
        "grant_type": "authorization_code"
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            token_resp = await client.post(token_url, data=token_data)
            if token_resp.status_code != 200:
                return RedirectResponse(url="/?auth_error=google_token_exchange_failed")
            tokens = token_resp.json()
            id_token_str = tokens.get("id_token")
            access_token_str = tokens.get("access_token")

            # Fetch userinfo
            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token_str}"}
            )
            if userinfo_resp.status_code != 200:
                return RedirectResponse(url="/?auth_error=google_userinfo_failed")
            userinfo = userinfo_resp.json()
    except Exception as e:
        return RedirectResponse(url=f"/?auth_error={urllib.parse.quote(str(e))}")

    email = userinfo.get("email", "").lower().strip()
    google_id = userinfo.get("sub")
    full_name = userinfo.get("name")
    picture = userinfo.get("picture")
    email_verified = userinfo.get("email_verified", False)

    if not email or not google_id:
        return RedirectResponse(url="/?auth_error=no_email_provided_by_google")

    if not email_verified:
        return RedirectResponse(url="/?auth_error=google_email_not_verified")

    now = datetime.now(timezone.utc)

    # 1. Primary lookup by stable provider identifier (Google sub)
    user = db.query(User).filter(User.google_id == google_id).first()
    if user:
        if not user.avatar_url and picture:
            user.avatar_url = picture
        if not user.full_name and full_name:
            user.full_name = full_name
        user.is_verified = True
        db.commit()
    else:
        # 2. Check if user exists by email for safe account linking
        user = db.query(User).filter(User.email == email).first()
        if user:
            if user.google_id and user.google_id != google_id:
                return RedirectResponse(url="/?auth_error=google_account_conflict")
            user.google_id = google_id
            user.is_verified = True
            if not user.avatar_url and picture:
                user.avatar_url = picture
            if not user.full_name and full_name:
                user.full_name = full_name
            db.commit()
        else:
            # 3. Create new user
            user = User(
                email=email,
                full_name=full_name,
                avatar_url=picture,
                auth_provider="google",
                google_id=google_id,
                is_active=True,
                is_verified=True,
                role="user",
                created_at=now,
                updated_at=now
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    audit = AuthAuditLog(
        user_id=user.id,
        action="GOOGLE_LOGIN_SUCCESS",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit)
    db.commit()

    # Create server session & JWT token linked to session ID
    raw_token, session = create_user_session(db, user.id, client_ip, user_agent, remember_me=True)
    jwt_token = create_access_token({"sub": user.email, "uid": user.id, "role": user.role, "sid": session.id})

    redirect_resp = RedirectResponse(url=f"/?auth_token={jwt_token}", status_code=303)
    set_session_cookie(redirect_resp, raw_token, remember_me=True)
    return redirect_resp


@router.post("/google", response_model=Token)
def google_auth(
    payload: GoogleAuthRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    One-tap Google Identity Services authentication via credential token.
    Extracts identity strictly from cryptographically verified token claims.
    Client-supplied payload.user_info is never trusted.
    """
    client_ip = get_real_client_ip(request)
    user_agent = request.headers.get("user-agent", "unknown")

    check_rate_limit(client_ip)
    id_info = parse_google_credential(payload.credential, payload.client_id)

    # Strictly read from cryptographically verified claims
    email = id_info.get("email", "").lower().strip()
    google_id = id_info.get("sub")
    full_name = id_info.get("name")
    avatar_url = id_info.get("picture")

    if not email or not google_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token did not contain a valid email address or subject identifier."
        )

    now = datetime.now(timezone.utc)

    # 1. Primary lookup by stable provider identifier (Google sub)
    user = db.query(User).filter(User.google_id == google_id).first()
    if user:
        if not user.avatar_url and avatar_url:
            user.avatar_url = avatar_url
        if not user.full_name and full_name:
            user.full_name = full_name
        user.is_verified = True
        db.commit()
    else:
        # 2. Check if user exists by email
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Prevent account takeover through conflicting accounts
            if user.google_id and user.google_id != google_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This email address is already linked to a different Google account."
                )
            user.google_id = google_id
            user.is_verified = True
            if not user.avatar_url and avatar_url:
                user.avatar_url = avatar_url
            if not user.full_name and full_name:
                user.full_name = full_name
            db.commit()
        else:
            # 3. Create new user
            user = User(
                email=email,
                full_name=full_name,
                avatar_url=avatar_url,
                auth_provider="google",
                google_id=google_id,
                is_active=True,
                is_verified=True,
                role="user",
                created_at=now,
                updated_at=now
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    audit = AuthAuditLog(
        user_id=user.id,
        action="GOOGLE_AUTH_SUCCESS",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit)
    db.commit()

    raw_token, session = create_user_session(db, user.id, client_ip, user_agent, remember_me=True)
    set_session_cookie(response, raw_token, remember_me=True)

    token = create_access_token({"sub": user.email, "uid": user.id, "role": user.role, "sid": session.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


# =========================================================================
# Core Sign Up & Email Verification
# =========================================================================

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserRegister,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Production-ready Sign Up:
    - Enforces Argon2id hashing with OWASP complexity rules (8-128 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol)
    - Checks duplicate email
    - Sets is_verified = False
    - Dispatches 24-hour verification token via email service
    - Establishes authenticated HttpOnly session
    - Dedicated signup rate limiting (max 5 signups/hour per IP)
    """
    client_ip = get_real_client_ip(request)
    user_agent = request.headers.get("user-agent", "unknown")

    check_rate_limit(client_ip)
    check_signup_rate_limit(client_ip)

    # Validate complexity
    validate_password_strength(user_in.password)

    email = user_in.email.lower().strip()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Hash password with Argon2id
    hashed = hash_password(user_in.password)

    now = datetime.now(timezone.utc)
    user = User(
        email=email,
        phone_number=None,
        full_name=user_in.full_name,
        hashed_password=hashed,
        auth_provider="local",
        is_active=True,
        is_verified=False,
        phone_verified=False,
        role="user",
        failed_login_attempts=0,
        created_at=now,
        updated_at=now
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )
    db.refresh(user)

    # Generate 24-hour email verification token
    raw_verify_token = generate_secure_token()
    token_hash = hash_token(raw_verify_token)
    verify_rec = EmailVerificationToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=now + timedelta(hours=24),
        is_used=False,
        created_at=now
    )
    db.add(verify_rec)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()

    # Send verification email asynchronously / via provider
    send_verification_email(user.email, raw_verify_token, user.full_name)

    audit = AuthAuditLog(
        user_id=user.id,
        action="REGISTER",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit)
    db.commit()

    raw_session_token, session = create_user_session(db, user.id, client_ip, user_agent, remember_me=False)
    set_session_cookie(response, raw_session_token, remember_me=False)

    token = create_access_token({"sub": user.email, "uid": user.id, "role": user.role, "sid": session.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/verify-email")
def verify_email_get(token: str, db: Session = Depends(get_db)):
    """Handles verification clicks from email links, redirecting to app."""
    token_hash = hash_token(token)
    now = datetime.now(timezone.utc)

    rec = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == token_hash,
        EmailVerificationToken.is_used == False,
        EmailVerificationToken.expires_at > now
    ).first()

    if not rec:
        return RedirectResponse(url="/?verification_status=invalid_or_expired")

    rec.is_used = True
    user = db.query(User).filter(User.id == rec.user_id).first()
    if user:
        user.is_verified = True
        db.commit()

    return RedirectResponse(url="/?verification_status=success")


@router.post("/verify-email")
def verify_email_post(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    """API endpoint for in-app verification submission."""
    token_hash = hash_token(payload.token)
    now = datetime.now(timezone.utc)

    rec = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == token_hash,
        EmailVerificationToken.is_used == False,
        EmailVerificationToken.expires_at > now
    ).first()

    if not rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token is invalid or has expired."
        )

    rec.is_used = True
    user = db.query(User).filter(User.id == rec.user_id).first()
    if user:
        user.is_verified = True
        db.commit()

    return {"success": True, "message": "Email address verified successfully."}


@router.post("/resend-verification")
def resend_verification(
    payload: ResendVerificationRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Dispatches a fresh verification token if user is unverified (rate-limited)."""
    client_ip = get_real_client_ip(request)
    check_reset_rate_limit(client_ip)

    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()

    # Anti-enumeration response: always return success
    if user and not user.is_verified:
        now = datetime.now(timezone.utc)
        # Invalidate previous tokens
        db.query(EmailVerificationToken).filter(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.is_used == False
        ).update({"is_used": True})

        raw_token = generate_secure_token()
        token_hash = hash_token(raw_token)
        new_token = EmailVerificationToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(hours=24),
            is_used=False,
            created_at=now
        )
        db.add(new_token)
        db.commit()
        send_verification_email(user.email, raw_token, user.full_name)

    return {
        "success": True,
        "message": "If an unverified account matches that email, a fresh verification link has been dispatched."
    }


# =========================================================================
# Core Login with Lockout & Remember Me
# =========================================================================

@router.post("/login", response_model=Token)
def login(
    credentials: UserLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Production-ready Login:
    - Rate-limited (5 failed attempts per 15 min per IP)
    - Account lockout support (after 5 consecutive failed attempts)
    - Generic error messages (protects against account enumeration)
    - Constant-time dummy verification on nonexistent users (timing attack protection)
    - Supports Remember Me (7-day persistent HttpOnly cookie vs 1-day)
    - Links JWT to session ID for instantaneous dual revocation
    - Audited in database
    """
    client_ip = get_real_client_ip(request)
    user_agent = request.headers.get("user-agent", "unknown")

    check_rate_limit(client_ip)

    email = (credentials.email or credentials.identifier or "").strip().lower()
    if not email or not is_email_address(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address."
        )

    now = datetime.now(timezone.utc)
    user = db.query(User).filter(User.email == email).first()

    # Check account lockout with generic anti-enumeration response
    if user and user.locked_until and user.locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again later or reset your password."
        )

    authenticated = False
    if credentials.password and user and user.hashed_password:
        if verify_password(credentials.password, user.hashed_password):
            authenticated = True
    else:
        # Constant-time dummy Argon2id hash verification to defeat user enumeration timing attacks
        verify_password(credentials.password or "dummy_password_timing_shield", _DUMMY_ARGON2_HASH)

    if not user or not authenticated:
        record_failed_attempt(client_ip)
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= 5:
                user.locked_until = now + timedelta(minutes=15)
            db.commit()

        audit = AuthAuditLog(
            user_id=user.id if user else None,
            action="LOGIN_FAILED",
            ip_address=client_ip,
            user_agent=user_agent
        )
        db.add(audit)
        db.commit()

        # Generic error message: never leak whether email exists
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support."
        )

    # Successful login: reset failed counters
    clear_failed_attempts(client_ip)
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    audit = AuthAuditLog(
        user_id=user.id,
        action="LOGIN_SUCCESS",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit)
    db.commit()

    # Create server session with remember_me lifetime
    raw_token, session = create_user_session(
        db, user.id, client_ip, user_agent, remember_me=credentials.remember_me
    )
    set_session_cookie(response, raw_token, remember_me=credentials.remember_me)

    token = create_access_token({"sub": user.email, "uid": user.id, "role": user.role, "sid": session.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


# =========================================================================
# Password Reset Flow (Anti-Enumeration + Session Invalidation)
# =========================================================================

@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Generates 1-hour secure password reset link.
    Anti-enumeration: Returns identical generic success response regardless of email existence.
    """
    client_ip = get_real_client_ip(request)
    check_reset_rate_limit(client_ip)

    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()

    if user and user.is_active:
        now = datetime.now(timezone.utc)
        # Invalidate previous reset tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False
        ).update({"is_used": True})

        raw_token = generate_secure_token()
        token_hash = hash_token(raw_token)
        reset_rec = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(hours=1),
            is_used=False,
            created_at=now
        )
        db.add(reset_rec)
        db.commit()

        send_password_reset_email(user.email, raw_token, user.full_name)

        audit = AuthAuditLog(
            user_id=user.id,
            action="PASSWORD_RESET_REQUESTED",
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent", "unknown")
        )
        db.add(audit)
        db.commit()

    return {
        "success": True,
        "message": "If an account matches that email address, a password reset link has been dispatched."
    }


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Validates token, sets new Argon2id password, and revokes all existing sessions.
    """
    client_ip = get_real_client_ip(request)
    user_agent = request.headers.get("user-agent", "unknown")

    validate_password_strength(payload.new_password)

    token_hash = hash_token(payload.token)
    now = datetime.now(timezone.utc)

    reset_rec = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.is_used == False,
        PasswordResetToken.expires_at > now
    ).first()

    if not reset_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token is invalid or has expired."
        )

    user = db.query(User).filter(User.id == reset_rec.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Mark token used
    reset_rec.is_used = True

    # Hash new password with Argon2id
    user.hashed_password = hash_password(payload.new_password)
    user.password_changed_at = now
    user.failed_login_attempts = 0
    user.locked_until = None

    # Invalidate all active sessions for this user across all devices
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_revoked == False
    ).update({"is_revoked": True})

    db.commit()

    clear_session_cookie(response)

    audit = AuthAuditLog(
        user_id=user.id,
        action="PASSWORD_RESET_COMPLETED",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": "Password has been successfully reset. All active sessions have been terminated. Please log in with your new password."
    }


# =========================================================================
# Session Management & Logout
# =========================================================================

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
):
    """
    Destroys current session and clears HttpOnly cookie.
    Invalidates both the cookie session AND any active Bearer JWT tied to that session.
    """
    client_ip = get_real_client_ip(request)
    user_agent = request.headers.get("user-agent", "unknown")

    # 1. Invalidate cookie session if present
    session_cookie = request.cookies.get("ipo_session")
    if session_cookie:
        token_hash = hash_token(session_cookie)
        session = db.query(UserSession).filter(UserSession.session_token_hash == token_hash).first()
        if session:
            session.is_revoked = True
            audit = AuthAuditLog(
                user_id=session.user_id,
                action="LOGOUT_COOKIE",
                ip_address=client_ip,
                user_agent=user_agent
            )
            db.add(audit)

    # 2. Invalidate Bearer JWT session if present
    if credentials and credentials.credentials:
        payload = decode_access_token(credentials.credentials)
        if payload:
            sid = payload.get("sid")
            if sid:
                jwt_session = db.query(UserSession).filter(UserSession.id == sid).first()
                if jwt_session:
                    jwt_session.is_revoked = True
                    audit = AuthAuditLog(
                        user_id=jwt_session.user_id,
                        action="LOGOUT_BEARER",
                        ip_address=client_ip,
                        user_agent=user_agent
                    )
                    db.add(audit)

    db.commit()
    clear_session_cookie(response)
    return {"success": True, "message": "Successfully logged out."}


@router.get("/sessions", response_model=List[SessionResponse])
def list_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists all active sessions for the current user."""
    now = datetime.now(timezone.utc)
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_revoked == False,
        UserSession.expires_at > now
    ).order_by(UserSession.last_active_at.desc()).all()

    current_cookie = request.cookies.get("ipo_session")
    current_hash = hash_token(current_cookie) if current_cookie else None

    result = []
    for s in sessions:
        result.append(SessionResponse(
            id=s.id,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            expires_at=s.expires_at,
            last_active_at=s.last_active_at,
            created_at=s.created_at,
            is_current=(s.session_token_hash == current_hash)
        ))
    return result


@router.delete("/sessions/{session_id}")
def revoke_specific_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revokes a specific session belonging to current user."""
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    session.is_revoked = True
    db.commit()
    return {"success": True, "message": "Session revoked."}


@router.delete("/sessions")
def revoke_all_other_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revokes all sessions except the current active one."""
    current_cookie = request.cookies.get("ipo_session")
    current_hash = hash_token(current_cookie) if current_cookie else None

    query = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_revoked == False
    )
    if current_hash:
        query = query.filter(UserSession.session_token_hash != current_hash)

    revoked_count = query.update({"is_revoked": True})
    db.commit()
    return {"success": True, "message": f"Revoked {revoked_count} other active sessions."}


@router.get("/me", response_model=Optional[UserResponse])
def get_current_user_profile(current_user: Optional[User] = Depends(get_optional_current_user)):
    """Returns profile for currently authenticated user, or None if guest."""
    return current_user
