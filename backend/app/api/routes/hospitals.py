from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter()


@router.get("")
async def list_hospitals(
    state: str | None = None,
    city: str | None = None,
    page: int = 1,
    per_page: int = 20,
    db: AsyncSession = Depends(get_db),
):
    where = ["h.is_active = true"]
    params: dict = {}
    if state:
        where.append("h.state = :state")
        params["state"] = state.upper()
    if city:
        where.append("LOWER(h.city) = LOWER(:city)")
        params["city"] = city
    where_sql = " AND ".join(where) if where else "true"
    params["limit"] = per_page
    params["offset"] = (page - 1) * per_page

    rows = (await db.execute(text(f"""
        SELECT h.id::text, h.name, h.slug, h.city, h.state, h.row_count, h.last_fetched,
               s.name as system_name
        FROM hospitals h
        LEFT JOIN hospital_systems s ON h.system_id = s.id
        WHERE {where_sql}
        ORDER BY h.name
        LIMIT :limit OFFSET :offset
    """), params)).fetchall()
    total = (await db.execute(text(f"SELECT COUNT(*) FROM hospitals h WHERE {where_sql}"), params)).scalar()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "hospitals": [{
            "id": r[0], "name": r[1], "slug": r[2], "city": r[3], "state": r[4],
            "procedure_count": r[5] or 0,
            "last_fetched": r[6].isoformat() if r[6] else None,
            "system": r[7],
        } for r in rows],
    }


@router.get("/states")
async def states(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text(
        "SELECT state, COUNT(*) FROM hospitals WHERE is_active=true AND state IS NOT NULL GROUP BY state ORDER BY state"
    ))).fetchall()
    return [{"state": r[0], "count": r[1]} for r in rows]


@router.get("/{slug}")
async def get_hospital(slug: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(text("""
        SELECT h.id::text, h.name, h.slug, h.city, h.state, h.zip, h.row_count, h.last_fetched,
               h.json_url, s.name, COUNT(DISTINCT c.id), COUNT(DISTINCT pr.payer_name)
        FROM hospitals h
        LEFT JOIN hospital_systems s ON h.system_id = s.id
        LEFT JOIN charges c ON c.hospital_id = h.id
        LEFT JOIN payer_rates pr ON pr.charge_id = c.id
        WHERE h.slug = :s
        GROUP BY h.id, s.name
    """), {"s": slug})).first()
    if not row:
        raise HTTPException(404, "Hospital not found")
    return {
        "id": row[0], "name": row[1], "slug": row[2], "city": row[3], "state": row[4],
        "zip": row[5], "procedure_count": row[6] or 0,
        "last_fetched": row[7].isoformat() if row[7] else None,
        "json_url": row[8], "system": row[9],
        "charge_count": row[10] or 0, "payer_count": row[11] or 0,
    }


@router.get("/{slug}/procedures")
async def hospital_procedures(
    slug: str, q: str | None = None, category: str | None = None,
    page: int = 1, per_page: int = 50,
    db: AsyncSession = Depends(get_db),
):
    where = ["h.slug = :slug"]
    params: dict = {"slug": slug, "limit": per_page, "offset": (page - 1) * per_page}
    if q:
        where.append("p.search_vector @@ plainto_tsquery('english', :q)")
        params["q"] = q
    if category:
        where.append("p.category = :cat")
        params["cat"] = category
    where_sql = " AND ".join(where)
    rows = (await db.execute(text(f"""
        SELECT p.description, p.cpt_code, p.category,
               c.gross_charge, c.cash_price, c.min_negotiated, c.max_negotiated, c.setting
        FROM charges c JOIN procedures p ON c.procedure_id = p.id
        JOIN hospitals h ON c.hospital_id = h.id
        WHERE {where_sql}
        ORDER BY p.description
        LIMIT :limit OFFSET :offset
    """), params)).fetchall()
    return {
        "page": page, "per_page": per_page,
        "procedures": [{
            "description": r[0], "cpt_code": r[1], "category": r[2],
            "gross_charge": r[3], "cash_price": r[4],
            "min_negotiated": r[5], "max_negotiated": r[6], "setting": r[7],
        } for r in rows],
    }


@router.get("/{slug}/payers")
async def hospital_payers(slug: str, db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text("""
        SELECT DISTINCT pr.payer_name FROM payer_rates pr
        JOIN charges c ON pr.charge_id = c.id
        JOIN hospitals h ON c.hospital_id = h.id
        WHERE h.slug = :s AND pr.payer_name IS NOT NULL
        ORDER BY pr.payer_name
    """), {"s": slug})).fetchall()
    return [r[0] for r in rows]
