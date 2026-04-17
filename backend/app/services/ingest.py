"""Providence data ingestion pipeline.

Stream-parses CMS machine-readable JSON files without loading into memory.
"""
import re
import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Iterator
import httpx
import ijson
from bs4 import BeautifulSoup
from sqlalchemy import text, select
from sqlalchemy.orm import Session as SyncSession
from app.core.database import get_sync_db
from app.models import Hospital, HospitalSystem, Procedure, Charge, PayerRate, IngestLog

logger = logging.getLogger(__name__)

PROVIDENCE_URL = "https://www.providence.org/billing-support/pricing-transparency"
USER_AGENT = "Mozilla/5.0 (compatible; ClearPriceBot/1.0; +https://clearpricehealth.org)"


def slugify(text: str) -> str:
    s = text.lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")


REGION_TO_STATE = {
    "alaska": "AK", "norcal": "CA", "socal": "CA",
    "montana": "MT", "oregon": "OR", "texas": "TX", "washington": "WA",
    "california": "CA",
}


def extract_region(url: str) -> tuple[str, str]:
    for region, state in REGION_TO_STATE.items():
        if region in url.lower():
            return region, state
    return "", ""


def scrape_providence_urls() -> list[dict]:
    """Scrape Providence's pricing transparency page for JSON URLs."""
    headers = {"User-Agent": USER_AGENT}
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            resp = client.get(PROVIDENCE_URL, headers=headers)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
    except Exception as e:
        logger.error(f"Failed to scrape Providence: {e}")
        return []

    urls = []
    seen = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "pricetransparency.providence.org" in href and href.endswith(".json"):
            if href in seen:
                continue
            seen.add(href)
            # Extract hospital name from URL: e.g. "providence-alaska-medical-center"
            # URL pattern: .../920016429_providence-alaska-medical-center_standardcharges.json
            filename = href.rsplit("/", 1)[-1]
            parts = filename.replace(".json", "").split("_")
            name = None
            for part in parts:
                if "-" in part and not part.isdigit() and "standardcharges" not in part:
                    name = part.replace("-", " ").title()
                    break
            if not name:
                # Fallback to link text, cleaned
                link_text = a.get_text(strip=True) or filename
                name = re.sub(r"(?i)machine[- ]readable.*?(?:file|files|json).*?for\s+", "", link_text).strip()
                if not name:
                    name = filename
            region, state = extract_region(href)
            urls.append({"name": name, "url": href, "region": region, "state": state})
    return urls


def upsert_hospital_system(db: SyncSession, name: str) -> uuid.UUID:
    slug = slugify(name)
    existing = db.execute(select(HospitalSystem).where(HospitalSystem.slug == slug)).scalar_one_or_none()
    if existing:
        return existing.id
    new = HospitalSystem(name=name, slug=slug, website="https://www.providence.org")
    db.add(new)
    db.commit()
    db.refresh(new)
    return new.id


def upsert_hospital(db: SyncSession, system_id: uuid.UUID, name: str, url: str, state: str) -> uuid.UUID:
    slug = slugify(name)
    existing = db.execute(select(Hospital).where(Hospital.slug == slug)).scalar_one_or_none()
    if existing:
        if existing.json_url != url:
            existing.json_url = url
            db.commit()
        return existing.id
    new = Hospital(
        system_id=system_id, name=name, slug=slug,
        state=state, json_url=url, is_active=True,
    )
    db.add(new)
    db.commit()
    db.refresh(new)
    return new.id


def check_file_changed(url: str, last_modified: str | None) -> bool:
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            resp = client.head(url, headers={"User-Agent": USER_AGENT})
            if resp.status_code != 200:
                return True
            new_lm = resp.headers.get("last-modified", "")
            if not last_modified:
                return True
            return new_lm != last_modified
    except Exception:
        return True


class _HttpxByteReader:
    """File-like wrapper around httpx streaming response for ijson."""
    def __init__(self, iterator):
        self._iter = iterator
        self._buf = b""

    def read(self, n=-1):
        while n < 0 or len(self._buf) < n:
            try:
                chunk = next(self._iter)
            except StopIteration:
                break
            self._buf += chunk
        if n < 0:
            data, self._buf = self._buf, b""
            return data
        data, self._buf = self._buf[:n], self._buf[n:]
        return data


def stream_parse_json(url: str) -> Iterator[dict]:
    """Stream parse CMS standard charge JSON. Yield one record at a time."""
    headers = {"User-Agent": USER_AGENT, "Accept-Encoding": "gzip"}
    with httpx.stream("GET", url, headers=headers, timeout=600.0, follow_redirects=True) as resp:
        resp.raise_for_status()
        reader = _HttpxByteReader(resp.iter_bytes(chunk_size=65536))
        parser = ijson.items(reader, "standard_charge_information.item")
        for item in parser:
            description = item.get("description", "")
            code_info = item.get("code_information", []) or []
            cpt = ""
            drg = ""
            for c in code_info:
                ctype = (c.get("type") or "").upper()
                code = c.get("code", "")
                if ctype == "CPT" and not cpt:
                    cpt = code
                elif ctype == "MS-DRG" and not drg:
                    drg = code
                elif ctype in ("HCPCS",) and not cpt:
                    cpt = code
            # billing_code alternative
            if not cpt and item.get("billing_code"):
                cpt = item["billing_code"]

            for std in item.get("standard_charges", []) or []:
                rec = {
                    "description": description,
                    "cpt_code": cpt,
                    "drg_code": drg,
                    "setting": std.get("setting", ""),
                    "gross_charge": std.get("gross_charge"),
                    "cash_price": std.get("discounted_cash"),
                    "min_negotiated": std.get("minimum"),
                    "max_negotiated": std.get("maximum"),
                    "payers": [],
                }
                for payer in std.get("payers_information", []) or []:
                    rec["payers"].append({
                        "payer_name": payer.get("payer_name", ""),
                        "plan_name": payer.get("plan_name", ""),
                        "rate": payer.get("standard_charge_dollar"),
                    })
                yield rec


def find_or_create_procedure(db: SyncSession, description: str, cpt: str, drg: str) -> uuid.UUID:
    # Prefer lookup by CPT
    if cpt:
        row = db.execute(
            text("SELECT id FROM procedures WHERE cpt_code = :c LIMIT 1"),
            {"c": cpt},
        ).first()
        if row:
            return row[0]
    # Fall back to description
    desc = (description or "")[:500]
    if not desc:
        desc = f"Procedure {cpt or drg or 'unknown'}"
    row = db.execute(
        text("SELECT id FROM procedures WHERE description = :d AND COALESCE(cpt_code,'') = :c LIMIT 1"),
        {"d": desc, "c": cpt or ""},
    ).first()
    if row:
        return row[0]
    new_id = uuid.uuid4()
    db.execute(
        text("INSERT INTO procedures (id, cpt_code, drg_code, description, search_vector) "
             "VALUES (:id, :c, :d, :desc, to_tsvector('english', :desc))"),
        {"id": new_id, "c": cpt or None, "d": drg or None, "desc": desc},
    )
    return new_id


def upsert_charge(db: SyncSession, hospital_id, procedure_id, rec: dict) -> uuid.UUID:
    setting = rec.get("setting", "") or ""
    row = db.execute(
        text("SELECT id FROM charges WHERE hospital_id = :h AND procedure_id = :p AND COALESCE(setting,'') = :s"),
        {"h": hospital_id, "p": procedure_id, "s": setting},
    ).first()
    if row:
        charge_id = row[0]
        db.execute(
            text("UPDATE charges SET gross_charge=:g, cash_price=:c, min_negotiated=:mn, max_negotiated=:mx, "
                 "updated_at=now() WHERE id = :id"),
            {"g": rec.get("gross_charge"), "c": rec.get("cash_price"),
             "mn": rec.get("min_negotiated"), "mx": rec.get("max_negotiated"),
             "id": charge_id},
        )
        db.execute(text("DELETE FROM payer_rates WHERE charge_id = :id"), {"id": charge_id})
    else:
        charge_id = uuid.uuid4()
        db.execute(
            text("INSERT INTO charges (id, hospital_id, procedure_id, setting, gross_charge, cash_price, "
                 "min_negotiated, max_negotiated) VALUES (:id,:h,:p,:s,:g,:c,:mn,:mx)"),
            {"id": charge_id, "h": hospital_id, "p": procedure_id, "s": setting,
             "g": rec.get("gross_charge"), "c": rec.get("cash_price"),
             "mn": rec.get("min_negotiated"), "mx": rec.get("max_negotiated")},
        )
    for p in rec.get("payers", []):
        if not p.get("payer_name"):
            continue
        db.execute(
            text("INSERT INTO payer_rates (id, charge_id, payer_name, plan_name, negotiated_rate) "
                 "VALUES (gen_random_uuid(), :ch, :pn, :pl, :r)"),
            {"ch": charge_id, "pn": p["payer_name"][:255],
             "pl": (p.get("plan_name") or "")[:255], "r": p.get("rate")},
        )
    return charge_id


def run_ingest_for_hospital(db: SyncSession, hospital_id: uuid.UUID) -> dict:
    hosp = db.execute(select(Hospital).where(Hospital.id == hospital_id)).scalar_one()
    logger.info(f"Starting ingest for {hosp.name}")
    log_id = uuid.uuid4()
    db.execute(
        text("INSERT INTO ingest_log (id, hospital_id, status) VALUES (:id, :h, 'running')"),
        {"id": log_id, "h": hospital_id},
    )
    db.commit()
    start = time.time()
    rows = 0
    try:
        for rec in stream_parse_json(hosp.json_url):
            proc_id = find_or_create_procedure(db, rec["description"], rec["cpt_code"], rec["drg_code"])
            upsert_charge(db, hospital_id, proc_id, rec)
            rows += 1
            if rows % 500 == 0:
                db.commit()
                logger.info(f"  {hosp.name}: {rows} rows")
        db.commit()
        duration = int(time.time() - start)
        db.execute(
            text("UPDATE ingest_log SET status='success', rows_imported=:r, duration_seconds=:d "
                 "WHERE id = :id"),
            {"r": rows, "d": duration, "id": log_id},
        )
        db.execute(
            text("UPDATE hospitals SET last_fetched=:n, row_count=:r WHERE id=:h"),
            {"n": datetime.now(timezone.utc), "r": rows, "h": hospital_id},
        )
        db.commit()
        logger.info(f"Completed {hosp.name}: {rows} rows in {duration}s")
        return {"hospital": hosp.name, "rows": rows, "duration": duration, "status": "success"}
    except Exception as e:
        db.rollback()
        duration = int(time.time() - start)
        db.execute(
            text("UPDATE ingest_log SET status='failed', rows_imported=:r, duration_seconds=:d, "
                 "error_message=:e WHERE id = :id"),
            {"r": rows, "d": duration, "e": str(e)[:1000], "id": log_id},
        )
        db.commit()
        logger.error(f"Failed {hosp.name}: {e}")
        return {"hospital": hosp.name, "rows": rows, "duration": duration, "status": "failed", "error": str(e)}


def run_full_providence_ingest() -> dict:
    urls = scrape_providence_urls()
    logger.info(f"Found {len(urls)} Providence JSON URLs")
    results = []
    with get_sync_db() as db:
        system_id = upsert_hospital_system(db, "Providence Health & Services")
        hospital_ids = []
        for info in urls:
            hid = upsert_hospital(db, system_id, info["name"], info["url"], info["state"])
            hospital_ids.append(hid)
        for hid in hospital_ids:
            results.append(run_ingest_for_hospital(db, hid))
    return {"total_hospitals": len(urls), "results": results}
