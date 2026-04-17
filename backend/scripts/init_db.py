"""Create all tables + seed system_settings. Run once after install."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, text
from app.core.config import settings
from app.core.database import Base, sync_engine
from app.models import (  # noqa: F401 -- ensure models registered
    HospitalSystem, Hospital, Procedure, Charge, PayerRate, IngestLog,
    User, Session, EmailSubscription, AiConversation, SystemSetting,
)
from app.core.security import hash_password

print("Creating all tables...")
Base.metadata.create_all(bind=sync_engine)

print("Seeding system_settings...")
seed_sql = """
INSERT INTO system_settings (id, key, value_plain, value_type, description, is_sensitive) VALUES
  (gen_random_uuid(), 'anthropic_api_key', NULL, 'string', 'Anthropic API key for Claude AI features', true),
  (gen_random_uuid(), 'claude_model', 'claude-sonnet-4-6', 'string', 'Claude model to use', false),
  (gen_random_uuid(), 'google_client_id', NULL, 'string', 'Google OAuth Client ID', true),
  (gen_random_uuid(), 'google_client_secret', NULL, 'string', 'Google OAuth Client Secret', true),
  (gen_random_uuid(), 'google_redirect_uri', 'https://clearpricehealth.org/api/auth/google/callback', 'string', 'Google OAuth redirect URI', false),
  (gen_random_uuid(), 'smtp_host', 'box.netplak.com', 'string', 'SMTP server hostname', false),
  (gen_random_uuid(), 'smtp_port', '587', 'int', 'SMTP server port', false),
  (gen_random_uuid(), 'smtp_user', NULL, 'string', 'SMTP login username', true),
  (gen_random_uuid(), 'smtp_password', NULL, 'string', 'SMTP login password', true),
  (gen_random_uuid(), 'smtp_from', 'noreply@clearpricehealth.org', 'string', 'From address for outgoing email', false),
  (gen_random_uuid(), 'ai_enabled', 'true', 'bool', 'Enable/disable all AI features', false),
  (gen_random_uuid(), 'google_oauth_enabled', 'false', 'bool', 'Enable/disable Google OAuth login', false)
ON CONFLICT (key) DO NOTHING;
"""

with sync_engine.begin() as conn:
    conn.execute(text(seed_sql))

print("Creating first admin user...")
from sqlalchemy.orm import Session as SyncSession
from app.models import User
with SyncSession(sync_engine) as db:
    existing = db.query(User).filter(User.email == settings.FIRST_ADMIN_EMAIL).first()
    if not existing and settings.FIRST_ADMIN_EMAIL and settings.FIRST_ADMIN_PASSWORD:
        admin = User(
            email=settings.FIRST_ADMIN_EMAIL,
            hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
            full_name="Admin",
            role="admin",
            is_active=True,
            is_verified=True,
        )
        db.add(admin)
        db.commit()
        print(f"  Admin created: {settings.FIRST_ADMIN_EMAIL}")
    else:
        print("  Admin already exists or no credentials provided")

print("Done.")
