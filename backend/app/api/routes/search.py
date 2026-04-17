from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter()


@router.get("")
async def search(
    q: str = Query(...),
    state: str | None = None,
    payer: str | None = None,
    page: int = 1,
    per_page: int = 20,
    db: AsyncSession = Depends(get_db),
):
    where = ["p.search_vector @@ plainto_tsquery('english', :q)"]
    params: dict = {"q": q, "limit": per_page, "offset": (page - 1) * per_page}
    if state:
        where.append("h.state = :state")
        params["state"] = state.upper()
    sql = f"""
        SELECT p.description, p.cpt_code, h.name, h.slug, h.city, h.state,
               c.gross_charge, c.cash_price, c.min_negotiated, c.max_negotiated,
               ts_rank(p.search_vector, plainto_tsquery('english', :q)) AS rank
        FROM charges c JOIN procedures p ON c.procedure_id = p.id
        JOIN hospitals h ON c.hospital_id = h.id
        WHERE {" AND ".join(where)} AND h.is_active = true
        ORDER BY rank DESC, c.cash_price NULLS LAST
        LIMIT :limit OFFSET :offset
    """
    rows = (await db.execute(text(sql), params)).fetchall()
    return {
        "query": q, "page": page, "per_page": per_page,
        "results": [{
            "procedure": r[0], "cpt_code": r[1],
            "hospital": r[2], "slug": r[3], "city": r[4], "state": r[5],
            "gross_charge": r[6], "cash_price": r[7],
            "min_negotiated": r[8], "max_negotiated": r[9],
        } for r in rows],
    }


@router.get("/suggestions")
async def suggestions(q: str = Query(...), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text("""
        SELECT description, cpt_code, similarity(description, :q) AS sim
        FROM procedures
        WHERE description % :q
        ORDER BY sim DESC
        LIMIT 10
    """), {"q": q})).fetchall()
    return [{"description": r[0], "cpt_code": r[1]} for r in rows]


@router.get("/cpt/{code}")
async def by_cpt(code: str, db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text("""
        SELECT p.description, h.name, h.slug, h.city, h.state,
               c.gross_charge, c.cash_price
        FROM procedures p JOIN charges c ON c.procedure_id = p.id
        JOIN hospitals h ON c.hospital_id = h.id
        WHERE p.cpt_code = :c
        ORDER BY c.cash_price NULLS LAST
    """), {"c": code})).fetchall()
    return [{
        "procedure": r[0], "hospital": r[1], "slug": r[2], "city": r[3], "state": r[4],
        "gross_charge": r[5], "cash_price": r[6],
    } for r in rows]
