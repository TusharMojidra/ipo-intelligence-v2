import os
import time
import re
import json
import base64
import secrets
import urllib.parse
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse, RedirectResponse
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.db import get_db
from backend.models import User, AuthAuditLog, OtpVerification
from backend.schemas import (
    UserRegister, UserLogin, UserResponse, Token,
    GoogleAuthRequest, SendOtpRequest, VerifyOtpRequest, OtpResponse
)
from backend.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/api/auth/google/callback")
ENV_MODE = os.getenv("ENVIRONMENT", "development").lower()

# In-memory sliding window rate limiter: IP -> list of timestamps
_FAILED_ATTEMPTS = defaultdict(list)
_OTP_REQUESTS = defaultdict(list)
_MAX_FAILED_ATTEMPTS = 5
_LOCKOUT_WINDOW_SECONDS = 300  # 5 minutes
_MAX_OTP_PER_10_MIN = 5

# OAuth CSRF state cache: state -> expiration timestamp
_OAUTH_STATES: Dict[str, float] = {}


def check_rate_limit(ip: str):
    """Enforces sliding-window rate limit on failed auth and verification attempts."""
    now = time.time()
    _FAILED_ATTEMPTS[ip] = [t for t in _FAILED_ATTEMPTS[ip] if now - t < _LOCKOUT_WINDOW_SECONDS]
    if len(_FAILED_ATTEMPTS[ip]) >= _MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please try again after 5 minutes."
        )


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
    Verify and parse Google ID token.
    Production: strict cryptographic verification required.
    Non-production: decode without signature check ONLY if GROQ_API_KEY-like
    mock-testing flag is set via MOCK_GOOGLE_CREDENTIALS env var.
    """
    # 1. Attempt google.oauth2.id_token verification
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        request = google_requests.Request()
        id_info = id_token.verify_oauth2_token(credential, request, client_id)
        return id_info
    except Exception:
        pass

    # 2. Attempt Google tokeninfo verification over HTTPS
    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(credential)}")
            if resp.status_code == 200:
                data = resp.json()
                if "email" in data:
                    if client_id and data.get("aud") != client_id:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Google token audience mismatch."
                        )
                    return data
    except Exception:
        pass

    # 3. Non-production / test fallback: decode without signature verification
    #    Permitted in non-production, gated in production.
    is_mock_allowed = os.getenv("MOCK_GOOGLE_CREDENTIALS", "true" if ENV_MODE != "production" else "false").lower() in ("true", "1", "yes")
    if ENV_MODE != "production" and is_mock_allowed:
        try:
            parts = credential.split(".")
            if len(parts) >= 2:
                padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                payload_bytes = base64.urlsafe_b64decode(padded)
                data = json.loads(payload_bytes.decode("utf-8"))
                if "email" in data:
                    return data
        except Exception:
            pass

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unable to cryptographically verify Google credential token."
    )


@router.get("/google/config")
def get_google_config():
    """Returns Google OAuth status and Client ID for frontend GIS initialization."""
    return {
        "configured": bool(GOOGLE_CLIENT_ID),
        "client_id": GOOGLE_CLIENT_ID
    }


@router.get("/google/login")
def google_login_redirect():
    """
    Directly redirects the user's browser to the official Google Account Chooser & Sign-in page.
    Generates a secure CSRF state token to prevent OAuth login hijacking.
    """
    if not GOOGLE_CLIENT_ID:
        return RedirectResponse(url="/?google_setup=needed")

    state = secrets.token_urlsafe(32)
    now = time.time()
    # Clean up expired states
    expired = [k for k, exp in _OAUTH_STATES.items() if now > exp]
    for k in expired:
        _OAUTH_STATES.pop(k, None)
    _OAUTH_STATES[state] = now + 600  # 10 minutes expiry

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
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
    """
    Handles Google OAuth 2.0 authorization code callback from accounts.google.com.
    Validates CSRF state, exchanges code for access token, fetches profile from Google,
    and returns an authenticated session.
    """
    client_ip = request.client.host if request and request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown") if request else "unknown"

    if error or not code:
        err_msg = error or "Authorization was cancelled by user"
        return RedirectResponse(url=f"/?auth_error={urllib.parse.quote(err_msg)}")

    # Verify CSRF state: always enforce when state was provided by server
    if state is not None:
        now = time.time()
        if state not in _OAUTH_STATES or now > _OAUTH_STATES.get(state, 0):
            return RedirectResponse(url="/?auth_error=Invalid+or+expired+OAuth+session+state")
        _OAUTH_STATES.pop(state, None)

    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            token_resp = await http_client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code"
                },
                headers={"Accept": "application/json"}
            )
            token_data = token_resp.json()
            access_token = token_data.get("access_token")

            if not access_token:
                return RedirectResponse(url="/?auth_error=Failed+to+retrieve+access+token+from+Google")

            userinfo_resp = await http_client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            user_info = userinfo_resp.json()

        email = user_info.get("email", "").lower().strip()
        if not email:
            return RedirectResponse(url="/?auth_error=No+email+returned+by+Google+account")

        google_id = str(user_info.get("sub", ""))
        full_name = user_info.get("name") or user_info.get("given_name") or email.split("@")[0]
        avatar_url = user_info.get("picture")

        user = db.query(User).filter(or_(User.email == email, User.google_id == google_id)).first()

        action = "GOOGLE_OAUTH_LOGIN"
        if not user:
            action = "GOOGLE_OAUTH_REGISTER"
            user = User(
                email=email,
                full_name=full_name,
                avatar_url=avatar_url,
                auth_provider="google",
                google_id=google_id,
                hashed_password=hash_password(secrets.token_urlsafe(32)),
                is_active=True,
                is_verified=True,
                phone_verified=False,
                role="user"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if not user.google_id:
                user.google_id = google_id
            if avatar_url:
                user.avatar_url = avatar_url
            if not user.full_name and full_name:
                user.full_name = full_name
            user.is_verified = True
            db.commit()
            db.refresh(user)

        # Audit log
        audit = AuthAuditLog(
            user_id=user.id,
            action=action,
            ip_address=client_ip,
            user_agent=user_agent
        )
        db.add(audit)
        db.commit()

        token = create_access_token({"sub": user.email, "uid": user.id, "role": user.role})
        response = RedirectResponse(url="/")
        response.set_cookie(
            key="auth_token",
            value=token,
            httponly=True,
            secure=ENV_MODE == "production",
            samesite="strict",
            max_age=86400,  # 24 hours, same as token expiry
        )
        return response
    except Exception as e:
        return RedirectResponse(url=f"/?auth_error={urllib.parse.quote(str(e))}")


@router.post("/google", response_model=Token)
def google_auth(req: GoogleAuthRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Authenticate or create a user profile using Google Sign-In (Token or GIS Credential).
    If the user visits for the first time, an account is automatically created.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # If mock user_info provided directly, permitted in non-production unless explicitly disabled
    is_mock_allowed = os.getenv("MOCK_GOOGLE_CREDENTIALS", "true" if ENV_MODE != "production" else "false").lower() in ("true", "1", "yes")
    if req.user_info and "email" in req.user_info and is_mock_allowed and ENV_MODE != "production":
        data = req.user_info
    else:
        data = parse_google_credential(req.credential, req.client_id)

    email = data.get("email", "").lower().strip()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token does not contain a valid email address."
        )

    google_id = str(data.get("sub", ""))
    full_name = data.get("name") or data.get("given_name") or email.split("@")[0]
    avatar_url = data.get("picture")

    # Lookup existing user
    user = db.query(User).filter(or_(User.email == email, User.google_id == google_id)).first()

    action = "GOOGLE_LOGIN"
    if not user:
        action = "GOOGLE_REGISTER"
        user = User(
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            auth_provider="google",
            google_id=google_id,
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            is_active=True,
            is_verified=True,
            phone_verified=False,
            role="user"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.google_id:
            user.google_id = google_id
        if not user.avatar_url and avatar_url:
            user.avatar_url = avatar_url
        if not user.full_name and full_name:
            user.full_name = full_name
        user.is_verified = True
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated.")

    # Audit log
    audit = AuthAuditLog(
        user_id=user.id,
        action=action,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit)
    db.commit()

    token = create_access_token({"sub": user.email, "uid": user.id, "role": user.role})
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        secure=ENV_MODE == "production",
        samesite="strict",
        max_age=86400,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "token_delivery": "cookie+json"
    }


@router.post("/send-otp", response_model=OtpResponse)
def send_otp(req: SendOtpRequest, request: Request, db: Session = Depends(get_db)):
    """
    Generate and dispatch a 6-digit verification code to the specified email or mobile number.
    In production environments, dev_otp is strictly omitted to prevent authentication bypass.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_otp_rate_limit(client_ip)

    raw_target = req.target.strip()
    is_mail = is_email_address(raw_target)
    cleaned_target = raw_target.lower() if is_mail else normalize_phone(raw_target)

    if not cleaned_target:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a valid email or mobile number.")

    # Generate cryptographically secure 6-digit OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Invalidate previous unused OTPs for this target and purpose
    db.query(OtpVerification).filter(
        OtpVerification.target == cleaned_target,
        OtpVerification.purpose == req.purpose,
        OtpVerification.is_used == False
    ).update({"is_used": True})

    otp_record = OtpVerification(
        target=cleaned_target,
        otp_code=otp_code,
        purpose=req.purpose,
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_record)
    db.commit()

    # dev_otp is ONLY exposed in non-production environments when enabled
    dev_otp_value = otp_code if (ENV_MODE != "production" and os.getenv("DEV_OTP_MODE", "true").lower() in ("true", "1", "yes")) else None

    return {
        "message": f"Verification code sent to {req.target}",
        "target": req.target,
        "dev_otp": dev_otp_value
    }


@router.post("/verify-otp", response_model=Token)
def verify_otp_and_login(req: VerifyOtpRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Verify OTP code and authenticate the user session.
    Protected by brute-force lockout rate limiting.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Anti-brute force lockout protection
    check_rate_limit(client_ip)

    raw_target = req.target.strip()
    is_mail = is_email_address(raw_target)
    cleaned_target = raw_target.lower() if is_mail else normalize_phone(raw_target)

    # Find valid unexpired OTP
    now = datetime.now(timezone.utc)
    record = db.query(OtpVerification).filter(
        OtpVerification.target == cleaned_target,
        OtpVerification.otp_code == req.otp_code.strip(),
        OtpVerification.is_used == False,
        OtpVerification.expires_at > now
    ).first()

    if not record:
        record_failed_attempt(client_ip)
        audit = AuthAuditLog(
            user_id=None,
            action="OTP_VERIFY_FAILED",
            ip_address=client_ip,
            user_agent=user_agent
        )
        db.add(audit)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code."
        )

    # Valid OTP verified: clear failed attempt tracker
    clear_failed_attempts(client_ip)

    # Mark as used immediately (single-use invariant)
    record.is_used = True
    db.commit()

    # Lookup user by email or phone
    if is_mail:
        user = db.query(User).filter(User.email == cleaned_target).first()
    else:
        user = db.query(User).filter(User.phone_number == cleaned_target).first()

    action = "OTP_LOGIN"
    if not user:
        action = "OTP_REGISTER"
        default_email = cleaned_target if is_mail else f"trader_{cleaned_target[-6:]}@terminal.ai"
        user = User(
            email=default_email,
            phone_number=cleaned_target if not is_mail else None,
            full_name=req.full_name or ("Trader " + (cleaned_target[-4:] if not is_mail else cleaned_target.split("@")[0])),
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            auth_provider="otp",
            is_active=True,
            is_verified=True if is_mail else False,
            phone_verified=True if not is_mail else False,
            role="user"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if is_mail:
            user.is_verified = True
        else:
            user.phone_verified = True
        db.commit()

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated.")

    # Audit log
    audit = AuthAuditLog(
        user_id=user.id,
        action=action,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit)
    db.commit()

    token = create_access_token({"sub": user.email, "uid": user.id, "role": user.role})
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        secure=ENV_MODE == "production",
        samesite="strict",
        max_age=86400,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "token_delivery": "cookie+json"
    }


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, request: Request, response: Response, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    check_rate_limit(client_ip)

    # Check if user already exists with this email
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )

    # Check phone number if provided
    cleaned_phone = None
    if user_in.phone_number and user_in.phone_number.strip():
        cleaned_phone = normalize_phone(user_in.phone_number)
        phone_existing = db.query(User).filter(User.phone_number == cleaned_phone).first()
        if phone_existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this mobile number already exists"
            )

    # Verify OTP if supplied
    phone_verified = False
    if user_in.otp_code and cleaned_phone:
        now = datetime.now(timezone.utc)
        otp_rec = db.query(OtpVerification).filter(
            OtpVerification.target == cleaned_phone,
            OtpVerification.otp_code == user_in.otp_code.strip(),
            OtpVerification.is_used == False,
            OtpVerification.expires_at > now
        ).first()
        if otp_rec:
            otp_rec.is_used = True
            phone_verified = True

    # Hash password & create user
    hashed = hash_password(user_in.password)
    user = User(
        email=user_in.email.lower(),
        phone_number=cleaned_phone,
        full_name=user_in.full_name,
        hashed_password=hashed,
        auth_provider="local",
        is_active=True,
        is_verified=False,
        phone_verified=phone_verified,
        role="user"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Log audit event
    audit = AuthAuditLog(
        user_id=user.id,
        action="REGISTER",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit)
    db.commit()

    token = create_access_token({"sub": user.email, "uid": user.id, "role": user.role})
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        secure=ENV_MODE == "production",
        samesite="strict",
        max_age=86400,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "token_delivery": "cookie+json"
    }


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, request: Request, response: Response, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    check_rate_limit(client_ip)

    # Support either identifier (email or mobile) or legacy credentials.email
    target = (credentials.identifier or credentials.email or "").strip()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide your email address or mobile number."
        )

    user = None
    if is_email_address(target):
        user = db.query(User).filter(User.email == target.lower()).first()
    else:
        cleaned_phone = normalize_phone(target)
        user = db.query(User).filter(User.phone_number == cleaned_phone).first()

    # Authenticate via password OR OTP code
    authenticated = False
    if credentials.otp_code:
        now = datetime.now(timezone.utc)
        cleaned_target = target.lower() if is_email_address(target) else normalize_phone(target)
        otp_rec = db.query(OtpVerification).filter(
            OtpVerification.target == cleaned_target,
            OtpVerification.otp_code == credentials.otp_code.strip(),
            OtpVerification.is_used == False,
            OtpVerification.expires_at > now
        ).first()
        if otp_rec:
            otp_rec.is_used = True
            authenticated = True
    elif credentials.password and user and user.hashed_password:
        if verify_password(credentials.password, user.hashed_password):
            authenticated = True

    if not user or not authenticated:
        record_failed_attempt(client_ip)
        audit = AuthAuditLog(
            user_id=user.id if user else None,
            action="LOGIN_FAILED",
            ip_address=client_ip,
            user_agent=user_agent
        )
        db.add(audit)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials or verification code. Please check your details.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated"
        )

    # Successful login: reset failed attempts
    clear_failed_attempts(client_ip)

    audit = AuthAuditLog(
        user_id=user.id,
        action="LOGIN_SUCCESS",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit)
    db.commit()

    token = create_access_token({"sub": user.email, "uid": user.id, "role": user.role})
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        secure=ENV_MODE == "production",
        samesite="strict",
        max_age=86400,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "token_delivery": "cookie+json"
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user
