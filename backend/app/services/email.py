"""Email service. Reads SMTP credentials from settings service at send time."""
import logging
import smtplib
from email.message import EmailMessage
from pathlib import Path
from fastapi import HTTPException
from sqlalchemy.orm import Session as SyncSession
from app.services.settings import get_setting

logger = logging.getLogger(__name__)

TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "email"


def get_smtp_config(db: SyncSession) -> dict:
    cfg = {
        "host": get_setting("smtp_host", db),
        "port": int(get_setting("smtp_port", db) or "587"),
        "user": get_setting("smtp_user", db),
        "password": get_setting("smtp_password", db),
        "from": get_setting("smtp_from", db) or "noreply@clearpricehealth.org",
    }
    if not cfg["user"] or not cfg["password"]:
        raise HTTPException(503, "Email not configured. Set SMTP credentials in Admin Settings -> Email / SMTP.")
    return cfg


def render_template(name: str, context: dict) -> tuple[str, str]:
    html_path = TEMPLATE_DIR / f"{name}.html"
    html = html_path.read_text(encoding="utf-8").format(**context)
    # Simple text version: strip tags
    import re
    text = re.sub(r"<[^>]+>", "", html)
    text = re.sub(r"\n\s*\n+", "\n\n", text).strip()
    return html, text


def send_email(to: str, subject: str, html_body: str, text_body: str, db: SyncSession) -> None:
    cfg = get_smtp_config(db)
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = cfg["from"]
    msg["To"] = to
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    last_err = None
    for attempt in range(3):
        try:
            with smtplib.SMTP(cfg["host"], cfg["port"], timeout=30) as smtp:
                smtp.starttls()
                smtp.login(cfg["user"], cfg["password"])
                smtp.send_message(msg)
            logger.info(f"Email sent to {to}: {subject}")
            return
        except Exception as e:
            last_err = e
            logger.warning(f"SMTP attempt {attempt+1} failed: {e}")
    raise RuntimeError(f"Failed to send email after 3 attempts: {last_err}")
