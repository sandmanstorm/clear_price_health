"""Ingestion tasks with retry + watchdog.

`ingest_single_hospital` auto-retries on transient network errors.
`watchdog_sweep` runs periodically to detect and heal ingest problems.
"""
import logging
import httpx
from app.tasks.celery_app import celery_app
from app.core.database import get_sync_db
from app.services.ingest import run_full_providence_ingest, run_ingest_for_hospital

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.ingest_tasks.ingest_providence")
def ingest_providence():
    return run_full_providence_ingest()


@celery_app.task(
    name="app.tasks.ingest_tasks.ingest_single_hospital",
    bind=True,
    autoretry_for=(httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout,
                   httpx.RemoteProtocolError, ConnectionResetError),
    retry_backoff=60,       # start at 60s, double each retry
    retry_backoff_max=900,  # cap at 15 min
    retry_jitter=True,
    max_retries=3,
    acks_late=True,
    soft_time_limit=5400,   # 90 min soft limit (SoftTimeLimitExceeded raised)
    time_limit=7200,        # 2 hr hard limit (worker killed)
)
def ingest_single_hospital(self, hospital_id: str):
    import uuid
    try:
        with get_sync_db() as db:
            return run_ingest_for_hospital(db, uuid.UUID(hospital_id))
    except Exception as exc:
        logger.warning(f"ingest_single_hospital({hospital_id}) failed (try {self.request.retries + 1}): {exc}")
        raise


@celery_app.task(name="app.tasks.ingest_tasks.tag_untagged_procedures")
def tag_untagged_procedures():
    try:
        from app.services.ai import auto_tag_procedures_batch
        auto_tag_procedures_batch()
    except Exception as e:
        logger.error(f"Auto-tagging failed: {e}")


# ===== Self-healing watchdog =====

def run_watchdog_sweep():
    """Run the sweep synchronously. Can be called from API, Celery task, or CLI.

    Detects and heals:
      1. Stale 'running' ingest_log rows (worker died mid-task)
      2. Hospitals with json_url that haven't been ingested in 7+ days
      3. Persistent transient failures (connection resets from last 2 hours)
    """
    from sqlalchemy import text
    from app.tasks.celery_app import celery_app as app

    summary: dict = {"stale_revived": 0, "overdue_queued": 0, "transient_retried": 0, "errors": []}

    # Get live task IDs from Celery
    try:
        inspector = app.control.inspect(timeout=3)
        active = inspector.active() or {}
        live_args = set()
        for worker_tasks in active.values():
            for t in worker_tasks or []:
                for a in t.get("args", []) or []:
                    live_args.add(str(a))
    except Exception as e:
        summary["errors"].append(f"inspect failed: {e}")
        live_args = set()

    with get_sync_db() as db:
        # 1. Stale 'running' rows: status='running' but task is not alive
        stale = db.execute(text("""
            SELECT il.id::text, il.hospital_id::text, h.name, il.ran_at
            FROM ingest_log il
            LEFT JOIN hospitals h ON il.hospital_id = h.id
            WHERE il.status = 'running'
              AND il.ran_at < now() - interval '30 minutes'
        """)).fetchall()
        for row in stale:
            il_id, hid, name, ran_at = row
            if hid in live_args:
                continue  # task still actually running
            logger.warning(f"Watchdog: stale 'running' row for {name} (ran_at={ran_at}), re-queueing")
            db.execute(text(
                "UPDATE ingest_log SET status='failed', error_message='Killed by watchdog: stuck running' "
                "WHERE id = :id"
            ), {"id": il_id})
            ingest_single_hospital.delay(hid)
            summary["stale_revived"] += 1
        db.commit()

        # 2. Hospitals overdue: json_url present, is_active=true, never ingested OR last > 7 days ago
        overdue = db.execute(text("""
            SELECT id::text, name FROM hospitals
            WHERE is_active = true
              AND json_url IS NOT NULL AND json_url != ''
              AND (last_fetched IS NULL OR last_fetched < now() - interval '7 days')
              AND id::text NOT IN (
                SELECT DISTINCT hospital_id::text FROM ingest_log
                WHERE status = 'running' OR ran_at > now() - interval '1 hour'
              )
            LIMIT 10
        """)).fetchall()
        for row in overdue:
            hid = row[0]
            if hid in live_args:
                continue
            logger.info(f"Watchdog: overdue hospital {row[1]}, queueing")
            ingest_single_hospital.delay(hid)
            summary["overdue_queued"] += 1

        # 3. Retry transient failures from last 2 hours
        transient = db.execute(text("""
            SELECT DISTINCT ON (il.hospital_id) il.hospital_id::text, il.error_message, h.name
            FROM ingest_log il
            JOIN hospitals h ON il.hospital_id = h.id
            WHERE il.status = 'failed'
              AND il.ran_at > now() - interval '2 hours'
              AND (il.error_message ILIKE '%connection%'
                   OR il.error_message ILIKE '%timeout%'
                   OR il.error_message ILIKE '%reset by peer%'
                   OR il.error_message ILIKE '%temporary failure%')
              AND h.is_active = true
              AND h.json_url IS NOT NULL
            ORDER BY il.hospital_id, il.ran_at DESC
            LIMIT 20
        """)).fetchall()
        for row in transient:
            hid = row[0]
            if hid in live_args:
                continue
            # Avoid infinite retry: check we haven't retried more than 3x in last 6h
            retry_count = db.execute(text("""
                SELECT COUNT(*) FROM ingest_log
                WHERE hospital_id = :h AND ran_at > now() - interval '6 hours'
            """), {"h": hid}).scalar()
            if retry_count and retry_count > 5:
                logger.info(f"Watchdog: {row[2]} already retried {retry_count}x in 6h, skipping")
                continue
            logger.info(f"Watchdog: retrying transient failure for {row[2]}: {row[1][:60] if row[1] else ''}")
            ingest_single_hospital.delay(hid)
            summary["transient_retried"] += 1

    logger.info(f"Watchdog sweep: {summary}")
    return summary


@celery_app.task(name="app.tasks.ingest_tasks.watchdog_sweep")
def watchdog_sweep():
    """Celery task wrapper around run_watchdog_sweep().
    Used by beat schedule; API calls run_watchdog_sweep() directly to bypass queue.
    """
    return run_watchdog_sweep()
