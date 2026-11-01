import os
import smtplib
import json
import urllib.request
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

PROJECT_EMAIL = "ipo.intelligence.app@gmail.com"


def send_feedback_email(
    feedback_id: str,
    name: Optional[str],
    email: str,
    category: str,
    subject: str,
    message: str,
    rating: Optional[int] = None
) -> Dict[str, Any]:
    """
    Dispatches feedback email to ipo.intelligence.app@gmail.com.
    Prioritizes:
    1. Direct SMTP if SMTP_USER and SMTP_PASSWORD/GMAIL_APP_PASSWORD are provided.
    2. Zero-config FormSubmit HTTP API (sends directly to ipo.intelligence.app@gmail.com).
    """
    smtp_user = os.getenv("SMTP_USER") or os.getenv("GMAIL_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD") or os.getenv("GMAIL_APP_PASSWORD")
    if smtp_user:
        smtp_user = smtp_user.strip()
    if smtp_pass:
        smtp_pass = smtp_pass.replace(" ", "").strip()
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    # 1. Try direct SMTP if credentials are provided in .env
    if smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[{category.upper()}] {subject} ({feedback_id})"
            msg["From"] = f"IPO Terminal <{smtp_user}>"
            msg["To"] = PROJECT_EMAIL
            msg["Reply-To"] = email

            plain_text = f"""
New IPO Terminal Feedback Received
----------------------------------
Ticket ID: {feedback_id}
Category: {category.upper()}
From: {name or 'Anonymous'} <{email}>
Rating: {rating or 'N/A'}/5
Subject: {subject}

Message:
{message}
"""
            html_content = f"""
<html>
<body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px;">
    <h2 style="color: #38bdf8; margin-top: 0;">New IPO Terminal Feedback</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
      <tr><td style="padding: 6px 0; color: #94a3b8;">Ticket ID:</td><td style="font-weight: bold; color: #34d399;">{feedback_id}</td></tr>
      <tr><td style="padding: 6px 0; color: #94a3b8;">Category:</td><td style="font-weight: bold; color: #f59e0b;">{category.upper()}</td></tr>
      <tr><td style="padding: 6px 0; color: #94a3b8;">From:</td><td style="color: #f8fafc;">{name or 'Anonymous'} (&lt;a href="mailto:{email}" style="color: #38bdf8;"&gt;{email}&lt;/a&gt;)</td></tr>
      <tr><td style="padding: 6px 0; color: #94a3b8;">Rating:</td><td style="color: #fbbf24;">{'⭐' * (rating or 5)} ({rating or 5}/5)</td></tr>
      <tr><td style="padding: 6px 0; color: #94a3b8;">Subject:</td><td style="font-weight: bold; color: #f8fafc;">{subject}</td></tr>
    </table>
    <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 14px; margin-top: 12px;">
      <p style="margin: 0; color: #cbd5e1; white-space: pre-wrap; font-size: 14px; line-height: 1.5;">{message}</p>
    </div>
    <p style="margin-top: 20px; font-size: 11px; color: #64748b; text-align: center;">
      IPO Intelligence Platform • Routed to {PROJECT_EMAIL}
    </p>
  </div>
</body>
</html>
"""
            msg.attach(MIMEText(plain_text, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)

            logger.info("Feedback email %s successfully sent via SMTP to %s", feedback_id, PROJECT_EMAIL)
            return {"status": "sent", "channel": "smtp", "target": PROJECT_EMAIL}
        except Exception as e:
            logger.error("SMTP delivery failed: %s. Falling back to HTTP delivery...", e)

    # 2. Free HTTP Gateway Delivery to ipo.intelligence.app@gmail.com
    try:
        url = f"https://formsubmit.co/ajax/{PROJECT_EMAIL}"
        payload_data = {
            "name": name or "IPO Terminal Investor",
            "email": email,
            "_subject": f"[{category.upper()}] {subject} ({feedback_id})",
            "ticket_id": feedback_id,
            "category": category,
            "rating": f"{rating}/5" if rating else "Not specified",
            "message": message,
            "_replyto": email,
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload_data).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPO-Terminal/2.0",
                "Origin": "https://ipo-intelligence.terminal",
                "Referer": "https://ipo-intelligence.terminal/feedback",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw_resp = json.loads(resp.read().decode())
            logger.info("FormSubmit delivery response: %s", raw_resp)
            if str(raw_resp.get("success")).lower() == "true":
                return {"status": "sent", "channel": "formsubmit", "target": PROJECT_EMAIL}
            else:
                return {
                    "status": "pending_activation",
                    "channel": "formsubmit",
                    "target": PROJECT_EMAIL,
                    "message": raw_resp.get("message", "Activation required"),
                }
    except Exception as ex:
        logger.error("HTTP gateway delivery failed: %s", ex)
        return {"status": "error", "detail": str(ex), "target": PROJECT_EMAIL}
