"""Multi-source hospital directory + MRF URL discovery.

Provides:
- import_cms_directory(): Populate `hospitals` from CMS Hospital General Information
  (~5,426 US acute care hospitals, authoritative source for names/addresses/CMS ID)
- fill_urls_from_dolthub(): Best-effort URL fill from community Dolthub dataset
- scrape_health_system(system_slug): Scrapers for major health systems we know about
- validate_urls(): HEAD each json_url, mark dead ones inactive
"""
import logging
import re
import uuid
import httpx
from sqlalchemy import text, select
from sqlalchemy.orm import Session as SyncSession
from app.core.database import get_sync_db
from app.models import Hospital, HospitalSystem

logger = logging.getLogger(__name__)

USER_AGENT = "Mozilla/5.0 (compatible; ClearPriceBot/1.0; +https://clearpricehealth.org)"


def _slugify(t: str) -> str:
    s = (t or "").lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")


def import_cms_directory(db: SyncSession) -> dict:
    """Pull CMS Hospital General Information dataset. ~5,426 hospitals.
    Populates hospitals table with name, cms_id (CCN), city, state, zip.
    Does NOT populate json_url - that's done by url fillers.
    """
    url = "https://data.cms.gov/provider-data/api/1/datastore/query/xubh-q36u/0"
    inserted = 0
    updated = 0
    offset = 0
    page_size = 500
    system_id = _get_or_create_system(db, "US Hospitals (CMS Directory)", "us-hospitals-cms")

    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        while True:
            r = client.get(url, params={"limit": page_size, "offset": offset})
            r.raise_for_status()
            batch = r.json().get("results", [])
            if not batch:
                break
            for rec in batch:
                cms_id = (rec.get("facility_id") or "").strip()
                name = (rec.get("facility_name") or "").strip()
                if not cms_id or not name:
                    continue
                # Only acute care and critical access hospitals have MRFs
                htype = (rec.get("hospital_type") or "")
                if "Acute Care" not in htype and "Critical Access" not in htype:
                    continue
                slug = _slugify(f"{name}-{cms_id}")
                existing = db.execute(
                    select(Hospital).where(Hospital.cms_id == cms_id)
                ).scalar_one_or_none()
                if existing:
                    existing.name = name
                    existing.city = rec.get("citytown") or existing.city
                    existing.state = rec.get("state") or existing.state
                    existing.zip = rec.get("zip_code") or existing.zip
                    updated += 1
                else:
                    db.add(Hospital(
                        system_id=system_id,
                        name=name,
                        slug=slug,
                        city=rec.get("citytown"),
                        state=rec.get("state"),
                        zip=rec.get("zip_code"),
                        cms_id=cms_id,
                        is_active=False,  # Not active until we find a URL
                    ))
                    inserted += 1
            db.commit()
            offset += len(batch)
            logger.info(f"CMS import: {offset} processed, {inserted} new, {updated} updated")
            if len(batch) < page_size:
                break
    return {"inserted": inserted, "updated": updated, "total_processed": offset}


def fill_urls_from_dolthub(db: SyncSession) -> dict:
    """Best-effort URL fill from Dolthub community dataset.
    NOTE: Dolthub data is from 2021, many URLs will be stale. We validate after.
    """
    found = 0
    validated = 0
    stale = 0
    with httpx.Client(timeout=60.0) as client:
        # Paginate through Dolthub
        offset = 0
        while True:
            q = f"SELECT npi_number, url, name FROM hospitals WHERE url IS NOT NULL AND url != '' LIMIT 500 OFFSET {offset}"
            r = client.get(
                "https://www.dolthub.com/api/v1alpha1/dolthub/hospital-price-transparency/master",
                params={"q": q},
            )
            r.raise_for_status()
            rows = r.json().get("rows", [])
            if not rows:
                break
            for row in rows:
                npi = (row.get("npi_number") or "").replace(".0", "").strip()
                url = (row.get("url") or "").strip()
                name = (row.get("name") or "").strip()
                if not url or not name:
                    continue
                # Accept any format - we'll mark is_active based on format (only JSON parseable now)
                # Match by name similarity since NPI != CCN (CMS ID)
                name_lower = name.lower()
                result = db.execute(
                    text("""
                        SELECT id FROM hospitals
                        WHERE LOWER(name) = :nm
                        OR similarity(LOWER(name), :nm) > 0.7
                        ORDER BY similarity(LOWER(name), :nm) DESC
                        LIMIT 1
                    """),
                    {"nm": name_lower},
                ).first()
                if result:
                    # Only ingest-ready if URL ends in .json (our parser only handles JSON for now)
                    is_json = url.lower().split("?")[0].endswith(".json")
                    db.execute(
                        text("""UPDATE hospitals SET json_url = :u,
                                is_active = CASE WHEN :isjson THEN true ELSE false END
                                WHERE id = :id AND (json_url IS NULL OR json_url = '')"""),
                        {"u": url, "id": result[0], "isjson": is_json},
                    )
                    found += 1
            db.commit()
            offset += len(rows)
            logger.info(f"Dolthub fill: {offset} processed, {found} URLs added")
            if len(rows) < 500:
                break
    return {"urls_filled": found}


def fill_urls_from_providence(db: SyncSession) -> dict:
    """Use existing Providence scraper to fill URLs for Providence-system hospitals."""
    from app.services.ingest import scrape_providence_urls
    urls = scrape_providence_urls()
    filled = 0
    for info in urls:
        name = info["name"].lower()
        result = db.execute(
            text("""
                SELECT id FROM hospitals
                WHERE LOWER(name) = :nm
                OR similarity(LOWER(name), :nm) > 0.7
                ORDER BY similarity(LOWER(name), :nm) DESC
                LIMIT 1
            """),
            {"nm": name},
        ).first()
        if result:
            db.execute(
                text("UPDATE hospitals SET json_url = :u, is_active = true WHERE id = :id"),
                {"u": info["url"], "id": result[0]},
            )
            filled += 1
    db.commit()
    return {"urls_filled": filled, "system": "Providence"}


def validate_urls(db: SyncSession, limit: int = 1000) -> dict:
    """HEAD each json_url; mark unreachable ones inactive."""
    rows = db.execute(
        text("SELECT id, json_url FROM hospitals WHERE json_url IS NOT NULL LIMIT :l"),
        {"l": limit},
    ).fetchall()
    valid = 0
    dead = 0
    with httpx.Client(timeout=15.0, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
        for row in rows:
            try:
                r = client.head(row[1])
                if r.status_code < 400:
                    db.execute(
                        text("UPDATE hospitals SET is_active = true WHERE id = :id"),
                        {"id": row[0]},
                    )
                    valid += 1
                else:
                    db.execute(
                        text("UPDATE hospitals SET is_active = false WHERE id = :id"),
                        {"id": row[0]},
                    )
                    dead += 1
            except Exception:
                db.execute(
                    text("UPDATE hospitals SET is_active = false WHERE id = :id"),
                    {"id": row[0]},
                )
                dead += 1
    db.commit()
    return {"valid": valid, "dead": dead}


def coverage_report(db: SyncSession) -> dict:
    """Return stats on URL coverage."""
    rows = db.execute(text("""
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN json_url IS NOT NULL AND json_url != '' THEN 1 END) AS with_url,
          COUNT(CASE WHEN is_active = true THEN 1 END) AS active,
          COUNT(CASE WHEN row_count > 0 THEN 1 END) AS ingested
        FROM hospitals
    """)).first()
    by_state = db.execute(text("""
        SELECT state, COUNT(*) AS total,
          COUNT(CASE WHEN json_url IS NOT NULL THEN 1 END) AS with_url
        FROM hospitals
        WHERE state IS NOT NULL
        GROUP BY state
        ORDER BY total DESC
        LIMIT 10
    """)).fetchall()
    return {
        "total": rows[0],
        "with_url": rows[1],
        "active": rows[2],
        "ingested": rows[3],
        "coverage_pct": round(100 * (rows[1] or 0) / (rows[0] or 1), 1),
        "top_states": [{"state": s[0], "total": s[1], "with_url": s[2]} for s in by_state],
    }


def _get_or_create_system(db: SyncSession, name: str, slug: str) -> uuid.UUID:
    existing = db.execute(select(HospitalSystem).where(HospitalSystem.slug == slug)).scalar_one_or_none()
    if existing:
        return existing.id
    new = HospitalSystem(name=name, slug=slug)
    db.add(new)
    db.commit()
    db.refresh(new)
    return new.id
