"""Settings service: single source of truth for all runtime config.

Storage: system_settings table (encrypted sensitive values via pgcrypto).
Cache: Redis for 60s.
Fallback: environment variables.
"""
import os
import logging
import redis
from sqlalchemy import text
from sqlalchemy.orm import Session as SyncSession
from app.core.config import settings as base_settings

logger = logging.getLogger(__name__)

redis_client = redis.from_url(base_settings.REDIS_URL)
CACHE_TTL = 60

SENSITIVE_KEYS = {
    "anthropic_api_key",
    "google_client_id",
    "google_client_secret",
    "smtp_user",
    "smtp_password",
}

ENV_FALLBACK_MAP = {
    "anthropic_api_key": "ANTHROPIC_API_KEY",
    "claude_model": "CLAUDE_MODEL",
    "google_client_id": "GOOGLE_CLIENT_ID",
    "google_client_secret": "GOOGLE_CLIENT_SECRET",
    "google_redirect_uri": "GOOGLE_REDIRECT_URI",
    "smtp_host": "SMTP_HOST",
    "smtp_port": "SMTP_PORT",
    "smtp_user": "SMTP_USER",
    "smtp_password": "SMTP_PASSWORD",
    "smtp_from": "SMTP_FROM",
    "ai_enabled": "AI_ENABLED",
    "google_oauth_enabled": "GOOGLE_OAUTH_ENABLED",
}


def _cache_key(key: str) -> str:
    return f"settings:{key}"


def get_setting(key: str, db: SyncSession | None = None) -> str:
    # 1. Redis cache
    try:
        cached = redis_client.get(_cache_key(key))
        if cached is not None:
            return cached.decode("utf-8")
    except Exception as e:
        logger.warning(f"Redis cache miss for {key}: {e}")

    value = ""
    if db is not None:
        is_sensitive = key in SENSITIVE_KEYS
        try:
            if is_sensitive:
                row = db.execute(
                    text(
                        "SELECT CASE WHEN value_encrypted IS NULL OR octet_length(value_encrypted) = 0 "
                        "THEN NULL ELSE pgp_sym_decrypt(value_encrypted, :key) END AS v "
                        "FROM system_settings WHERE key = :k"
                    ),
                    {"key": base_settings.ENCRYPTION_KEY, "k": key},
                ).first()
            else:
                row = db.execute(
                    text("SELECT value_plain AS v FROM system_settings WHERE key = :k"),
                    {"k": key},
                ).first()
            if row and row[0]:
                value = str(row[0])
        except Exception as e:
            logger.warning(f"DB setting read failed for {key}: {e}")

    # 2. Env fallback
    if not value:
        env_key = ENV_FALLBACK_MAP.get(key, key.upper())
        value = os.environ.get(env_key, "")

    try:
        redis_client.setex(_cache_key(key), CACHE_TTL, value)
    except Exception:
        pass
    return value


def set_setting(key: str, value: str, db: SyncSession, updated_by_user_id=None) -> None:
    is_sensitive = key in SENSITIVE_KEYS
    if is_sensitive:
        db.execute(
            text(
                "INSERT INTO system_settings (id, key, value_encrypted, value_type, is_sensitive, updated_by) "
                "VALUES (gen_random_uuid(), :k, pgp_sym_encrypt(:v, :ek), 'string', true, :uid) "
                "ON CONFLICT (key) DO UPDATE SET "
                "value_encrypted = pgp_sym_encrypt(:v, :ek), "
                "updated_at = now(), updated_by = :uid"
            ),
            {"k": key, "v": value, "ek": base_settings.ENCRYPTION_KEY, "uid": updated_by_user_id},
        )
    else:
        db.execute(
            text(
                "INSERT INTO system_settings (id, key, value_plain, value_type, is_sensitive, updated_by) "
                "VALUES (gen_random_uuid(), :k, :v, 'string', false, :uid) "
                "ON CONFLICT (key) DO UPDATE SET "
                "value_plain = :v, updated_at = now(), updated_by = :uid"
            ),
            {"k": key, "v": value, "uid": updated_by_user_id},
        )
    db.commit()
    try:
        redis_client.delete(_cache_key(key))
    except Exception:
        pass
    logger.info(f"Setting updated: {key} (sensitive={is_sensitive})")


def get_all_settings_for_admin(db: SyncSession) -> list[dict]:
    rows = db.execute(
        text("SELECT key, value_plain, value_encrypted, value_type, description, is_sensitive "
             "FROM system_settings ORDER BY key")
    ).fetchall()
    result = []
    for row in rows:
        key = row[0]
        is_sensitive = row[5]
        has_value = bool((row[2] and len(row[2]) > 0) if is_sensitive else row[1])
        if is_sensitive:
            display_value = "*****" if has_value else ""
        else:
            display_value = row[1] or ""
        result.append({
            "key": key,
            "value": display_value,
            "value_type": row[3],
            "description": row[4],
            "is_sensitive": is_sensitive,
            "is_set": has_value,
        })
    return result


def reload_settings() -> int:
    count = 0
    try:
        for k in redis_client.scan_iter("settings:*"):
            redis_client.delete(k)
            count += 1
    except Exception as e:
        logger.warning(f"reload_settings failed: {e}")
    return count
