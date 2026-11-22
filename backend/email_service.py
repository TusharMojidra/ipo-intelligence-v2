import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
import httpx

logger = logging.getLogger("email_service")

# Environment configuration
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "IPO Intelligence Terminal <onboarding@resend.dev>")
APP_BASE_URL = os.getenv("APP_BASE_URL", "https://ipo-intelligence-terminal.onrender.com").rstrip("/")
ENV_MODE = os.getenv("ENVIRONMENT", "development").lower()


def _get_verification_html(verify_url: str, full_name: Optional[str]) -> str:
    greeting = f"Hello {full_name}," if full_name else "Hello,"
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="no-referrer">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080C10; color: #F0F4F8; margin: 0; padding: 40px 20px; }}
    .container {{ max-width: 560px; margin: 0 auto; background-color: #0D1117; border: 1px solid #1E2D3D; border-radius: 12px; padding: 36px 32px; }}
    .header {{ border-bottom: 1px solid #1E2D3D; padding-bottom: 20px; margin-bottom: 24px; }}
    .brand {{ color: #00E5CC; font-weight: 700; font-size: 18px; letter-spacing: -0.02em; }}
    h1 {{ color: #FFFFFF; font-size: 22px; font-weight: 700; margin: 0 0 16px; }}
    p {{ color: #8B9EB0; font-size: 14px; line-height: 1.6; margin: 0 0 20px; }}
    .btn {{ display: inline-block; background-color: #00E5CC; color: #040810; font-weight: 600; font-size: 14px; padding: 12px 28px; text-decoration: none; border-radius: 8px; margin: 16px 0; }}
    .link-alt {{ font-family: monospace; font-size: 11px; word-break: break-all; color: #4A6080; background: #111820; padding: 8px 12px; border-radius: 6px; border: 1px solid #1E2D3D; }}
    .footer {{ margin-top: 32px; pt-4; border-top: 1px solid #1E2D3D; font-size: 12px; color: #4A6080; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="brand">IPO INTELLIGENCE TERMINAL</span>
    </div>
    <h1>Verify Your Email Address</h1>
    <p>{greeting}</p>
    <p>Thank you for registering on IPO Intelligence Terminal. Please confirm your email address by clicking the button below to activate your quantitative analysis workspace:</p>
    <div>
      <a href="{verify_url}" rel="noreferrer noopener" class="btn" target="_blank">Verify Email Address</a>
    </div>
    <p>This verification link will securely expire in <strong>24 hours</strong>. If you did not create an account, you can safely ignore this email.</p>
    <div class="footer">
      <p>Or paste this URL directly into your browser:</p>
      <div class="link-alt">{verify_url}</div>
    </div>
  </div>
</body>
</html>"""


def _get_password_reset_html(reset_url: str, full_name: Optional[str]) -> str:
    greeting = f"Hello {full_name}," if full_name else "Hello,"
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="no-referrer">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080C10; color: #F0F4F8; margin: 0; padding: 40px 20px; }}
    .container {{ max-width: 560px; margin: 0 auto; background-color: #0D1117; border: 1px solid #1E2D3D; border-radius: 12px; padding: 36px 32px; }}
    .header {{ border-bottom: 1px solid #1E2D3D; padding-bottom: 20px; margin-bottom: 24px; }}
    .brand {{ color: #00E5CC; font-weight: 700; font-size: 18px; letter-spacing: -0.02em; }}
    h1 {{ color: #FFFFFF; font-size: 22px; font-weight: 700; margin: 0 0 16px; }}
    p {{ color: #8B9EB0; font-size: 14px; line-height: 1.6; margin: 0 0 20px; }}
    .btn {{ display: inline-block; background-color: #F59E0B; color: #040810; font-weight: 600; font-size: 14px; padding: 12px 28px; text-decoration: none; border-radius: 8px; margin: 16px 0; }}
    .link-alt {{ font-family: monospace; font-size: 11px; word-break: break-all; color: #4A6080; background: #111820; padding: 8px 12px; border-radius: 6px; border: 1px solid #1E2D3D; }}
    .footer {{ margin-top: 32px; pt-4; border-top: 1px solid #1E2D3D; font-size: 12px; color: #4A6080; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="brand">IPO INTELLIGENCE TERMINAL</span>
    </div>
    <h1>Reset Your Account Password</h1>
    <p>{greeting}</p>
    <p>A password reset was requested for your IPO Intelligence Terminal account. Click the button below to choose a new password:</p>
    <div>
      <a href="{reset_url}" rel="noreferrer noopener" class="btn" target="_blank">Reset Password</a>
    </div>
    <p>For your security, this link will expire in <strong>1 hour</strong>. Once your password is changed, all other active sessions will be automatically terminated.</p>
    <p>If you did not request a password reset, please ignore this email or contact support if you suspect unauthorized activity.</p>
    <div class="footer">
      <p>Or paste this URL directly into your browser:</p>
      <div class="link-alt">{reset_url}</div>
    </div>
  </div>
</body>
</html>"""


def _send_via_resend(to_email: str, subject: str, html_content: str) -> bool:
    """Send email via Resend transactional HTTP API."""
    api_key = os.getenv("RESEND_API_KEY", RESEND_API_KEY)
    sender = os.getenv("SMTP_FROM_EMAIL", SMTP_FROM_EMAIL) or "IPO Intelligence Terminal <onboarding@resend.dev>"
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": sender,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content
                }
            )
            if resp.status_code in (200, 201):
                logger.info(f"Email sent via Resend to {to_email}")
                return True
            logger.error(f"Resend error: {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        logger.error(f"Failed to send email via Resend: {e}")
        return False


def _send_via_smtp(to_email: str, subject: str, html_content: str) -> bool:
    """Send email via standard SMTP server."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM_EMAIL
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))

        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
            server.starttls()

        if SMTP_USER and SMTP_PASSWORD:
            server.login(SMTP_USER, SMTP_PASSWORD)

        server.sendmail(SMTP_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Email sent via SMTP to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email via SMTP: {e}")
        return False


def send_verification_email(to_email: str, token: str, full_name: Optional[str] = None) -> bool:
    """Dispatches an email verification link to the user."""
    verify_url = f"{APP_BASE_URL}/?verify_token={token}"
    subject = "Verify your IPO Intelligence Terminal Account"
    html = _get_verification_html(verify_url, full_name)

    active_resend_key = os.getenv("RESEND_API_KEY", RESEND_API_KEY)
    if active_resend_key:
        return _send_via_resend(to_email, subject, html)
    elif SMTP_HOST:
        return _send_via_smtp(to_email, subject, html)
    else:
        # Dev console fallback: redact token in production
        if ENV_MODE == "production":
            logger.info(f"Verification email dispatched for {to_email} (URL token redacted in production logs)")
        else:
            print("\n" + "=" * 70)
            print(f"[EMAIL DEV FALLBACK] Verification Email to: {to_email}")
            print(f"Verify URL: {verify_url}")
            print("=" * 70 + "\n")
            logger.warning(f"No email provider configured. Verification URL logged to console: {verify_url}")
        return True


def send_password_reset_email(to_email: str, token: str, full_name: Optional[str] = None) -> bool:
    """Dispatches a password reset link to the user."""
    reset_url = f"{APP_BASE_URL}/?reset_token={token}"
    subject = "Reset your IPO Intelligence Terminal Password"
    html = _get_password_reset_html(reset_url, full_name)

    active_resend_key = os.getenv("RESEND_API_KEY", RESEND_API_KEY)
    if active_resend_key:
        return _send_via_resend(to_email, subject, html)
    elif SMTP_HOST:
        return _send_via_smtp(to_email, subject, html)
    else:
        # Dev console fallback: redact token in production
        if ENV_MODE == "production":
            logger.info(f"Password reset email dispatched for {to_email} (URL token redacted in production logs)")
        else:
            print("\n" + "=" * 70)
            print(f"[EMAIL DEV FALLBACK] Password Reset Email to: {to_email}")
            print(f"Reset URL: {reset_url}")
            print("=" * 70 + "\n")
            logger.warning(f"No email provider configured. Password Reset URL logged to console: {reset_url}")
        return True


def send_feedback_email(
    feedback_id: str,
    name: Optional[str],
    email: str,
    category: str,
    subject: str,
    message: str,
    rating: Optional[int] = None
) -> dict:
    """Dispatches feedback/contact notifications."""
    mail_subject = f"[IPO Terminal Feedback] {category.upper()}: {subject} ({feedback_id})"
    html = f"""<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #080C10; color: #fff; padding: 20px;">
  <h2>New Feedback Ticket: {feedback_id}</h2>
  <p><strong>From:</strong> {name or 'Anonymous'} &lt;{email}&gt;</p>
  <p><strong>Category:</strong> {category}</p>
  <p><strong>Rating:</strong> {rating or 'N/A'}/5</p>
  <hr/>
  <p><strong>Subject:</strong> {subject}</p>
  <p style="background: #111820; padding: 15px; border-radius: 8px;">{message}</p>
</body>
</html>"""
    sent = False
    channel = "dev_console"
    if RESEND_API_KEY:
        sent = _send_via_resend(SMTP_FROM_EMAIL, mail_subject, html)
        channel = "resend"
    elif SMTP_HOST:
        sent = _send_via_smtp(SMTP_FROM_EMAIL, mail_subject, html)
        channel = "smtp"
    else:
        logger.info(f"Feedback recorded: {feedback_id} from {email}")
        sent = True

    return {"delivered": sent, "channel": channel}
