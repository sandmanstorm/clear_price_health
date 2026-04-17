"""Celery tasks for multi-source hospital data collection.

Each task wraps a function from app.services.sources. Separated from
ingestion tasks so admin can trigger URL population independently from
the heavy MRF streaming.
"""
import logging
from app.tasks.celery_app import celery_app
from app.core.database import get_sync_db
from app.services import sources

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.source_tasks.import_cms_directory")
def import_cms_directory():
    with get_sync_db() as db:
        return sources.import_cms_directory(db)


@celery_app.task(name="app.tasks.source_tasks.fill_urls_from_dolthub")
def fill_urls_from_dolthub():
    with get_sync_db() as db:
        return sources.fill_urls_from_dolthub(db)


@celery_app.task(name="app.tasks.source_tasks.fill_urls_from_providence")
def fill_urls_from_providence():
    with get_sync_db() as db:
        return sources.fill_urls_from_providence(db)


@celery_app.task(name="app.tasks.source_tasks.validate_urls")
def validate_urls(limit: int = 1000):
    with get_sync_db() as db:
        return sources.validate_urls(db, limit=limit)
