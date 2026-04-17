from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session as SyncSession
from sqlalchemy import text
from app.core.database import get_db, get_sync_db
from app.core.security import require_admin
from app.models import User
from app.services.settings import get_all_settings_for_admin, set_setting, reload_settings, get_setting
from app.services import ai as ai_service

router = APIRouter()


class SetSettingReq(BaseModel):
    value: str


class ToggleAiReq(BaseModel):
    enabled: bool


class TestEmailReq(BaseModel):
    to: str


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    row = (await db.execute(text("""
        SELECT
          (SELECT COUNT(*) FROM hospitals WHERE is_active=true),
          (SELECT COUNT(*) FROM procedures),
          (SELECT COUNT(*) FROM charges),
          (SELECT MAX(ran_at) FROM ingest_log WHERE status='success')
    """))).first()
    return {
        "hospitals": row[0], "procedures": row[1], "charges": row[2],
        "last_ingest": row[3].isoformat() if row[3] else None,
    }


@router.get("/ingest/status")
async def ingest_status(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    rows = (await db.execute(text("""
        SELECT il.id::text, h.name, il.status, il.rows_imported, il.duration_seconds, il.ran_at, il.error_message
        FROM ingest_log il LEFT JOIN hospitals h ON il.hospital_id = h.id
        ORDER BY il.ran_at DESC LIMIT 50
    """))).fetchall()
    return [{
        "id": r[0], "hospital": r[1], "status": r[2], "rows": r[3],
        "duration": r[4], "ran_at": r[5].isoformat() if r[5] else None,
        "error": r[6],
    } for r in rows]


@router.post("/ingest/providence")
async def trigger_providence_ingest(_: User = Depends(require_admin)):
    from app.tasks.ingest_tasks import ingest_providence
    task = ingest_providence.delay()
    return {"task_id": task.id, "status": "queued"}


@router.post("/ingest/hospital/{hospital_id}")
async def trigger_single_ingest(hospital_id: str, _: User = Depends(require_admin)):
    from app.tasks.ingest_tasks import ingest_single_hospital
    task = ingest_single_hospital.delay(hospital_id)
    return {"task_id": task.id, "status": "queued"}


@router.get("/hospitals")
async def admin_hospitals(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    rows = (await db.execute(text("""
        SELECT h.id::text, h.name, h.slug, h.state, h.row_count, h.is_active, h.json_url, h.last_fetched
        FROM hospitals h ORDER BY h.name
    """))).fetchall()
    return [{
        "id": r[0], "name": r[1], "slug": r[2], "state": r[3],
        "row_count": r[4], "is_active": r[5], "json_url": r[6],
        "last_fetched": r[7].isoformat() if r[7] else None,
    } for r in rows]


# Settings endpoints
@router.get("/settings")
async def list_settings(_: User = Depends(require_admin)):
    with get_sync_db() as db:
        return get_all_settings_for_admin(db)


@router.put("/settings/{key}")
async def update_setting(key: str, req: SetSettingReq, user: User = Depends(require_admin)):
    with get_sync_db() as db:
        set_setting(key, req.value, db, updated_by_user_id=user.id)
        return {"success": True, "key": key}


@router.post("/settings/reload")
async def reload_settings_endpoint(_: User = Depends(require_admin)):
    count = reload_settings()
    return {"reloaded": True, "keys_flushed": count}


@router.post("/settings/test-email")
async def test_email(req: TestEmailReq, _: User = Depends(require_admin)):
    from app.services.email import send_email, render_template, get_smtp_config
    with get_sync_db() as db:
        try:
            cfg = get_smtp_config(db)
        except HTTPException as e:
            return {"success": False, "error": e.detail}
        try:
            send_email(
                req.to, "ClearPrice Test Email",
                "<h1>Test successful</h1><p>Your SMTP configuration works.</p>",
                "Test successful. Your SMTP configuration works.",
                db,
            )
            return {"success": True, "smtp_host": cfg["host"]}
        except Exception as e:
            return {"success": False, "error": str(e)}


@router.post("/settings/test-ai")
async def test_ai(_: User = Depends(require_admin)):
    with get_sync_db() as db:
        try:
            client, model = ai_service._get_claude_client(db)
            msg = client.messages.create(
                model=model, max_tokens=64,
                messages=[{"role": "user", "content": "Reply with exactly: OK"}],
            )
            preview = "".join(b.text for b in msg.content if b.type == "text")[:200]
            return {"success": True, "model": model, "response_preview": preview}
        except HTTPException as e:
            return {"success": False, "error": e.detail}
        except Exception as e:
            return {"success": False, "error": str(e)}


@router.post("/settings/test-google-oauth")
async def test_google(_: User = Depends(require_admin)):
    with get_sync_db() as db:
        cid = get_setting("google_client_id", db)
        csec = get_setting("google_client_secret", db)
        redirect = get_setting("google_redirect_uri", db)
        if not cid or not csec:
            return {"success": False, "error": "Client ID or Secret not set"}
        return {"success": True, "redirect_uri": redirect, "client_id_set": bool(cid)}


@router.post("/ai/toggle")
async def toggle_ai(req: ToggleAiReq, user: User = Depends(require_admin)):
    with get_sync_db() as db:
        set_setting("ai_enabled", "true" if req.enabled else "false", db, updated_by_user_id=user.id)
    return {"enabled": req.enabled}


@router.get("/ai/conversations")
async def ai_conversations(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    rows = (await db.execute(text("""
        SELECT id::text, question, LEFT(answer, 200), hospital_slug, created_at
        FROM ai_conversations ORDER BY created_at DESC LIMIT 50
    """))).fetchall()
    return [{
        "id": r[0], "question": r[1], "answer_preview": r[2],
        "hospital_slug": r[3], "created_at": r[4].isoformat() if r[4] else None,
    } for r in rows]


# ===== Multi-source hospital directory endpoints =====

@router.get("/sources/coverage")
async def sources_coverage(_: User = Depends(require_admin)):
    """URL coverage report: how many hospitals have json_url, by state."""
    from app.services.sources import coverage_report
    with get_sync_db() as db:
        return coverage_report(db)


@router.post("/sources/import-cms")
async def trigger_import_cms(_: User = Depends(require_admin)):
    """Import full CMS Hospital General Information directory (~5,400 hospitals)."""
    from app.tasks.source_tasks import import_cms_directory
    task = import_cms_directory.delay()
    return {"task_id": task.id, "status": "queued",
            "note": "Imports ~5,400 hospitals. Takes ~2 min. No MRF URLs yet."}


@router.post("/sources/fill-urls/dolthub")
async def trigger_fill_dolthub(_: User = Depends(require_admin)):
    """Best-effort URL fill from Dolthub community data (note: 2021-era data)."""
    from app.tasks.source_tasks import fill_urls_from_dolthub
    task = fill_urls_from_dolthub.delay()
    return {"task_id": task.id, "status": "queued",
            "note": "Dolthub data is from 2021. Many URLs may be stale. Run validate-urls afterward."}


@router.post("/sources/fill-urls/providence")
async def trigger_fill_providence(_: User = Depends(require_admin)):
    """Re-run Providence scraper to fill URLs for Providence hospitals."""
    from app.tasks.source_tasks import fill_urls_from_providence
    task = fill_urls_from_providence.delay()
    return {"task_id": task.id, "status": "queued"}


@router.post("/sources/validate-urls")
async def trigger_validate_urls(_: User = Depends(require_admin)):
    """HEAD each json_url to check if reachable. Marks dead URLs inactive."""
    from app.tasks.source_tasks import validate_urls
    task = validate_urls.delay()
    return {"task_id": task.id, "status": "queued",
            "note": "Validates up to 1000 URLs. Dead URLs marked is_active=false."}


@router.post("/ingest/all-active")
async def trigger_ingest_all_active(_: User = Depends(require_admin)):
    """Trigger ingest for all hospitals with json_url and is_active=true.
    WARNING: downloads ALL MRF files (~1 TB for full CMS). Ensure disk space first.
    """
    from app.tasks.ingest_tasks import ingest_single_hospital
    from sqlalchemy.orm import Session as SyncSession
    from sqlalchemy import text as sql_text
    with get_sync_db() as db:
        rows = db.execute(sql_text(
            "SELECT id::text FROM hospitals WHERE is_active = true AND json_url IS NOT NULL AND json_url != ''"
        )).fetchall()
    task_ids = []
    for row in rows:
        task = ingest_single_hospital.delay(row[0])
        task_ids.append(task.id)
    return {"queued_hospitals": len(task_ids), "task_count": len(task_ids)}


# ===== Hospital CRUD =====

from pydantic import Field
from fastapi import UploadFile, File
import csv
import io
import uuid as _uuid


class HospitalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    slug: str | None = None
    city: str | None = None
    state: str | None = None
    zip: str | None = None
    cms_id: str | None = None
    json_url: str | None = None
    is_active: bool = True


class HospitalUpdate(BaseModel):
    name: str | None = None
    city: str | None = None
    state: str | None = None
    zip: str | None = None
    cms_id: str | None = None
    json_url: str | None = None
    is_active: bool | None = None


def _slugify(t: str) -> str:
    import re
    s = (t or "").lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")


@router.get("/hospitals/manage")
async def manage_hospitals_list(
    q: str | None = None,
    state: str | None = None,
    has_url: str | None = None,
    page: int = 1,
    per_page: int = 50,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List hospitals with filters for admin management UI."""
    where = []
    params: dict = {"limit": per_page, "offset": (page - 1) * per_page}
    if q:
        where.append("(h.name ILIKE :q OR h.cms_id = :cms_exact)")
        params["q"] = f"%{q}%"
        params["cms_exact"] = q
    if state:
        where.append("h.state = :state")
        params["state"] = state.upper()
    if has_url == "yes":
        where.append("h.json_url IS NOT NULL AND h.json_url != ''")
    elif has_url == "no":
        where.append("(h.json_url IS NULL OR h.json_url = '')")
    where_sql = " AND ".join(where) if where else "true"
    rows = (await db.execute(text(f"""
        SELECT h.id::text, h.name, h.slug, h.city, h.state, h.zip, h.cms_id,
               h.json_url, h.is_active, h.row_count, h.last_fetched
        FROM hospitals h WHERE {where_sql}
        ORDER BY h.name
        LIMIT :limit OFFSET :offset
    """), params)).fetchall()
    total = (await db.execute(text(f"SELECT COUNT(*) FROM hospitals h WHERE {where_sql}"), params)).scalar()
    return {
        "total": total, "page": page, "per_page": per_page,
        "hospitals": [{
            "id": r[0], "name": r[1], "slug": r[2], "city": r[3], "state": r[4],
            "zip": r[5], "cms_id": r[6], "json_url": r[7], "is_active": r[8],
            "row_count": r[9], "last_fetched": r[10].isoformat() if r[10] else None,
        } for r in rows],
    }


@router.post("/hospitals/manage")
async def create_hospital(req: HospitalCreate, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    slug = req.slug or _slugify(req.name) or str(_uuid.uuid4())[:8]
    # Ensure slug unique
    exists = (await db.execute(text("SELECT 1 FROM hospitals WHERE slug = :s"), {"s": slug})).scalar()
    if exists:
        slug = f"{slug}-{str(_uuid.uuid4())[:6]}"
    new_id = _uuid.uuid4()
    await db.execute(text("""
        INSERT INTO hospitals (id, name, slug, city, state, zip, cms_id, json_url, is_active, row_count)
        VALUES (:id, :n, :s, :c, :st, :z, :cms, :url, :act, 0)
    """), {"id": new_id, "n": req.name, "s": slug, "c": req.city, "st": req.state,
           "z": req.zip, "cms": req.cms_id, "url": req.json_url, "act": req.is_active})
    await db.commit()
    return {"id": str(new_id), "slug": slug}


@router.put("/hospitals/manage/{hospital_id}")
async def update_hospital(hospital_id: str, req: HospitalUpdate, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    updates = req.model_dump(exclude_unset=True)
    if not updates:
        return {"ok": True, "note": "No changes"}
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = hospital_id
    await db.execute(text(f"UPDATE hospitals SET {set_clause}, updated_at = now() WHERE id = :id"), updates)
    await db.commit()
    return {"ok": True, "updated": list(updates.keys())}


@router.delete("/hospitals/manage/{hospital_id}")
async def delete_hospital(hospital_id: str, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    # Soft delete: mark inactive. Use ?hard=true for full delete.
    await db.execute(text("UPDATE hospitals SET is_active = false WHERE id = :id"), {"id": hospital_id})
    await db.commit()
    return {"ok": True, "deactivated": hospital_id}


@router.post("/hospitals/manage/{hospital_id}/ingest")
async def trigger_single_hospital_ingest(hospital_id: str, _: User = Depends(require_admin)):
    """Trigger ingest for one hospital (reads its json_url and streams)."""
    from app.tasks.ingest_tasks import ingest_single_hospital
    task = ingest_single_hospital.delay(hospital_id)
    return {"task_id": task.id, "status": "queued", "hospital_id": hospital_id}


@router.post("/hospitals/manage/bulk-upload")
async def bulk_upload_hospitals(
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Upload CSV to add/update hospitals in bulk.
    CSV columns (name required): name, state, city, zip, cms_id, json_url, is_active
    """
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    created = 0
    updated = 0
    errors = []
    for i, row in enumerate(reader, start=2):  # start=2 (header is row 1)
        name = (row.get("name") or "").strip()
        if not name:
            errors.append(f"Row {i}: missing name")
            continue
        url = (row.get("json_url") or "").strip() or None
        cms_id = (row.get("cms_id") or "").strip() or None
        state = (row.get("state") or "").strip() or None
        city = (row.get("city") or "").strip() or None
        zip_ = (row.get("zip") or "").strip() or None
        is_active = (row.get("is_active") or "true").strip().lower() in ("true", "1", "yes", "y")
        # Upsert by cms_id if present, else by name+state
        existing = None
        if cms_id:
            existing = (await db.execute(text("SELECT id FROM hospitals WHERE cms_id = :c"), {"c": cms_id})).first()
        if not existing and name and state:
            existing = (await db.execute(text(
                "SELECT id FROM hospitals WHERE LOWER(name) = LOWER(:n) AND state = :s"
            ), {"n": name, "s": state})).first()
        if existing:
            await db.execute(text("""
                UPDATE hospitals SET json_url = COALESCE(:u, json_url),
                                    city = COALESCE(:c, city),
                                    zip = COALESCE(:z, zip),
                                    is_active = :a,
                                    updated_at = now()
                WHERE id = :id
            """), {"u": url, "c": city, "z": zip_, "a": is_active, "id": existing[0]})
            updated += 1
        else:
            slug = _slugify(name) or str(_uuid.uuid4())[:8]
            # Ensure unique
            n = 0
            base_slug = slug
            while (await db.execute(text("SELECT 1 FROM hospitals WHERE slug = :s"), {"s": slug})).scalar():
                n += 1
                slug = f"{base_slug}-{n}"
            await db.execute(text("""
                INSERT INTO hospitals (id, name, slug, city, state, zip, cms_id, json_url, is_active, row_count)
                VALUES (gen_random_uuid(), :n, :s, :c, :st, :z, :cms, :u, :a, 0)
            """), {"n": name, "s": slug, "c": city, "st": state, "z": zip_, "cms": cms_id, "u": url, "a": is_active})
            created += 1
    await db.commit()
    return {"created": created, "updated": updated, "errors": errors[:20]}


# ===== Task Control =====

@router.get("/tasks/active")
async def active_tasks(_: User = Depends(require_admin)):
    """List all active + reserved Celery tasks across all workers."""
    from app.tasks.celery_app import celery_app
    try:
        inspector = celery_app.control.inspect(timeout=3)
        active = inspector.active() or {}
        reserved = inspector.reserved() or {}
        scheduled = inspector.scheduled() or {}
    except Exception as e:
        return {"error": str(e), "active": [], "reserved": [], "scheduled": []}

    def flatten(by_worker):
        out = []
        for worker, tasks in (by_worker or {}).items():
            for t in tasks or []:
                out.append({
                    "worker": worker,
                    "task_id": t.get("id"),
                    "name": t.get("name"),
                    "args": t.get("args", []),
                    "time_start": t.get("time_start"),
                })
        return out

    return {
        "active": flatten(active),
        "reserved": flatten(reserved),
        "scheduled": flatten(scheduled),
        "worker_count": len(active.keys()) if active else 0,
    }


@router.post("/tasks/{task_id}/revoke")
async def revoke_task(task_id: str, terminate: bool = True, _: User = Depends(require_admin)):
    """Cancel/revoke a running or queued Celery task."""
    from app.tasks.celery_app import celery_app
    celery_app.control.revoke(task_id, terminate=terminate, signal="SIGTERM")
    return {"revoked": task_id, "terminate": terminate}


@router.post("/tasks/purge")
async def purge_queue(_: User = Depends(require_admin)):
    """Purge ALL pending tasks from the queue. Running tasks keep running."""
    from app.tasks.celery_app import celery_app
    count = celery_app.control.purge()
    return {"purged_messages": count}
"""Snippet to append to admin.py — adds /api/admin/health/ingest endpoint."""

@router.get("/health/ingest")
async def ingest_health(_: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Operational health of the ingestion pipeline.
    Traffic-light status: green = healthy, yellow = degraded, red = broken.
    """
    # Queue state from Celery
    from app.tasks.celery_app import celery_app as app
    try:
        inspector = app.control.inspect(timeout=3)
        active_by_worker = inspector.active() or {}
        reserved_by_worker = inspector.reserved() or {}
        active_count = sum(len(v or []) for v in active_by_worker.values())
        reserved_count = sum(len(v or []) for v in reserved_by_worker.values())
        worker_count = len(active_by_worker.keys())
    except Exception:
        active_count = 0
        reserved_count = 0
        worker_count = 0

    # Stats from DB
    rows = (await db.execute(text("""
        SELECT
          COUNT(*) FILTER (WHERE status = 'success' AND ran_at > now() - interval '1 hour') AS succeeded_1h,
          COUNT(*) FILTER (WHERE status = 'failed'  AND ran_at > now() - interval '1 hour') AS failed_1h,
          COUNT(*) FILTER (WHERE status = 'running' AND ran_at < now() - interval '30 minutes') AS stuck_running,
          MAX(ran_at) AS last_activity,
          COUNT(DISTINCT hospital_id) FILTER (WHERE status = 'success') AS hospitals_ingested
        FROM ingest_log
    """))).first()

    succeeded_1h = rows[0] or 0
    failed_1h = rows[1] or 0
    stuck = rows[2] or 0
    last_activity = rows[3]
    hospitals_with_data = rows[4] or 0

    total_1h = succeeded_1h + failed_1h
    success_rate = (succeeded_1h / total_1h) if total_1h > 0 else None

    # Traffic light
    status = "green"
    reasons = []
    if stuck > 0:
        status = "yellow"
        reasons.append(f"{stuck} task(s) stuck in 'running' state > 30min")
    if worker_count == 0:
        status = "red"
        reasons.append("No Celery workers online")
    if success_rate is not None and success_rate < 0.3 and total_1h >= 5:
        status = "yellow" if status == "green" else status
        reasons.append(f"Success rate {int(success_rate * 100)}% over last hour")
    if last_activity:
        from datetime import datetime, timezone
        age_min = (datetime.now(timezone.utc) - last_activity).total_seconds() / 60
        if (reserved_count > 0 or active_count > 0) and age_min > 30:
            status = "yellow" if status == "green" else status
            reasons.append(f"Queue non-empty but no activity for {int(age_min)}min")

    return {
        "status": status,
        "reasons": reasons,
        "workers": worker_count,
        "active_tasks": active_count,
        "reserved_tasks": reserved_count,
        "last_hour": {
            "succeeded": succeeded_1h,
            "failed": failed_1h,
            "success_rate": round(success_rate, 2) if success_rate is not None else None,
        },
        "stuck_running": stuck,
        "hospitals_ingested_total": hospitals_with_data,
        "last_activity": last_activity.isoformat() if last_activity else None,
    }


@router.post("/health/force-watchdog")
async def force_watchdog(_: User = Depends(require_admin)):
    """Manually run the watchdog sweep synchronously (bypasses Celery queue).
    Useful when workers are busy with long-running ingests.
    """
    from app.tasks.ingest_tasks import run_watchdog_sweep
    result = run_watchdog_sweep()
    return {"status": "executed", "summary": result}
