from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter()


@router.get("/categories")
async def categories(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text(
        "SELECT category, COUNT(*) FROM procedures WHERE category IS NOT NULL GROUP BY category ORDER BY category"
    ))).fetchall()
    return [{"category": r[0], "count": r[1]} for r in rows]


@router.get("/{cpt_code}")
async def procedure_detail(cpt_code: str, db: AsyncSession = Depends(get_db)):
    proc = (await db.execute(text(
        "SELECT id::text, description, cpt_code, category FROM procedures WHERE cpt_code = :c LIMIT 1"
    ), {"c": cpt_code})).first()
    if not proc:
        raise HTTPException(404, "Procedure not found")
    charges = (await db.execute(text("""
        SELECT h.name, h.slug, h.city, h.state,
               c.gross_charge, c.cash_price, c.min_negotiated, c.max_negotiated
        FROM charges c JOIN hospitals h ON c.hospital_id = h.id
        WHERE c.procedure_id = :p
        ORDER BY c.cash_price NULLS LAST
    """), {"p": proc[0]})).fetchall()
    stats_row = (await db.execute(text("""
        SELECT MIN(cash_price), MAX(cash_price), AVG(cash_price),
               percentile_cont(0.5) WITHIN GROUP (ORDER BY cash_price)
        FROM charges WHERE procedure_id = :p AND cash_price IS NOT NULL
    """), {"p": proc[0]})).first()
    return {
        "procedure": {
            "description": proc[1], "cpt_code": proc[2], "category": proc[3],
        },
        "national_stats": {
            "min": stats_row[0], "max": stats_row[1], "mean": stats_row[2], "median": stats_row[3],
        },
        "hospitals": [{
            "name": r[0], "slug": r[1], "city": r[2], "state": r[3],
            "gross_charge": r[4], "cash_price": r[5],
            "min_negotiated": r[6], "max_negotiated": r[7],
        } for r in charges],
    }
