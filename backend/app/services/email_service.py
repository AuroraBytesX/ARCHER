import smtplib
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
from app.core.logging import logger

class EmailService:
    @staticmethod
    def send_email(to_email: str, subject: str, body_text: str, body_html: str = None) -> bool:
        """
        Dispatches emails via:
        1. Resend REST API (if RESEND_API_KEY is configured)
        2. SMTP / Gmail TLS port 587 (fallback)
        """
        # Option 1: Resend Cloud API
        if settings.RESEND_API_KEY and settings.RESEND_API_KEY.strip():
            try:
                from_addr = settings.RESEND_FROM_EMAIL or "onboarding@resend.dev"
                payload = {
                    "from": from_addr,
                    "to": [to_email],
                    "subject": subject,
                    "text": body_text,
                }
                if body_html:
                    payload["html"] = body_html

                headers = {
                    "Authorization": f"Bearer {settings.RESEND_API_KEY.strip()}",
                    "Content-Type": "application/json"
                }

                with httpx.Client(timeout=10.0) as client:
                    resp = client.post("https://api.resend.com/emails", json=payload, headers=headers)
                    if resp.status_code in [200, 201]:
                        logger.info(f"Email successfully dispatched to {to_email} via Resend Cloud API with subject: {subject}")
                        return True
                    else:
                        logger.warning(f"Resend API returned status {resp.status_code}: {resp.text}. Falling back to SMTP.")
            except Exception as resend_err:
                logger.warning(f"Resend dispatch error: {resend_err}. Falling back to SMTP.")

        # Option 2: SMTP / Gmail
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.warning("Neither Resend nor SMTP credentials configured. Email logged to console.")
            logger.info(f"To: {to_email} | Subject: {subject} | Body: {body_text}")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
            msg["To"] = to_email

            part1 = MIMEText(body_text, "plain")
            msg.attach(part1)

            if body_html:
                part2 = MIMEText(body_html, "html")
                msg.attach(part2)

            if settings.SMTP_PORT == 465:
                with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)

            logger.info(f"Email successfully dispatched to {to_email} via SMTP with subject: {subject}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email} via SMTP: {str(e)}")
            return False
