from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "clearprice",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.ingest_tasks", "app.tasks.email_tasks", "app.tasks.source_tasks"],
)

celery_app.conf.beat_schedule = {
    # Self-healing: every 15 minutes, sweep for stuck/stale/retryable work
    "watchdog-sweep": {
        "task": "app.tasks.ingest_tasks.watchdog_sweep",
        "schedule": crontab(minute="*/15"),
    },
    # Nightly URL health check: validate all json_urls
    "nightly-validate-urls": {
        "task": "app.tasks.source_tasks.validate_urls",
        "schedule": crontab(hour=1, minute=0),
    },
    # Nightly source refresh: re-scrape Providence for new hospitals/URLs
    "nightly-refresh-providence": {
        "task": "app.tasks.source_tasks.fill_urls_from_providence",
        "schedule": crontab(hour=1, minute=30),
    },
    # Primary ingest run: pulls Providence's full dataset nightly
    "nightly-ingest-providence": {
        "task": "app.tasks.ingest_tasks.ingest_providence",
        "schedule": crontab(hour=2, minute=0),
    },
    # Weekly digest email
    "weekly-digest-email": {
        "task": "app.tasks.email_tasks.send_weekly_digest",
        "schedule": crontab(hour=8, minute=0, day_of_week=1),
    },
}

celery_app.conf.timezone = "America/Los_Angeles"
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]
celery_app.conf.result_expires = 3600
# Ensure workers recover gracefully; preserves task on worker crash
celery_app.conf.task_acks_late = True
celery_app.conf.task_reject_on_worker_lost = True
celery_app.conf.worker_max_tasks_per_child = 50  # recycle worker after 50 tasks to prevent memory leaks
