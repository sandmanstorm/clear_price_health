import logging
from itsdangerous import URLSafeTimedSerializer
from app.tasks.celery_app import celery_app
from app.core.config import settings
from app.core.database import get_sync_db
from app.services.email import send_email, render_template
from app.models import User

logger = logging.getLogger(__name__)

serializer = URLSafeTimedSerializer(settings.APP_SECRET_KEY)


def make_token(user_id: str, salt: str) -> str:
    return serializer.dumps(user_id, salt=salt)


@celery_app.task(name="app.tasks.email_tasks.send_verification_email")
def send_verification_email(user_id: str):
    with get_sync_db() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        token = make_token(str(user.id), "email-verify")
        html, txt = render_template("verify_email", {
            "name": user.full_name or user.email,
            "verify_url": f"{settings.FRONTEND_URL}/verify?token={token}",
        })
        try:
            send_email(user.email, "Verify your ClearPrice account", html, txt, db)
        except Exception as e:
            logger.error(f"verify email failed: {e}")


@celery_app.task(name="app.tasks.email_tasks.send_password_reset_email")
def send_password_reset_email(user_id: str):
    with get_sync_db() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        token = make_token(str(user.id), "password-reset")
        html, txt = render_template("password_reset", {
            "name": user.full_name or user.email,
            "reset_url": f"{settings.FRONTEND_URL}/reset-password?token={token}",
        })
        try:
            send_email(user.email, "Reset your ClearPrice password", html, txt, db)
        except Exception as e:
            logger.error(f"reset email failed: {e}")


@celery_app.task(name="app.tasks.email_tasks.send_welcome_email")
def send_welcome_email(user_id: str):
    with get_sync_db() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        html, txt = render_template("welcome", {
            "name": user.full_name or user.email,
            "frontend_url": settings.FRONTEND_URL,
        })
        try:
            send_email(user.email, "Welcome to ClearPrice", html, txt, db)
        except Exception as e:
            logger.error(f"welcome email failed: {e}")


@celery_app.task(name="app.tasks.email_tasks.send_weekly_digest")
def send_weekly_digest():
    logger.info("Weekly digest: skipping (implement when subscriptions exist)")
