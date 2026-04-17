from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter()


class CompareReq(BaseModel):
    procedure_query: str
    hospital_slugs: list[str] = Field(..., min_length=2, max_length=5)
    payer: str | None = None


@router.post("")
async def compare(req: CompareReq, db: AsyncSession = Depends(get_db)):
    proc = (await db.execute(text("""
        SELECT id::text, description, cpt_code
        FROM procedures
        WHERE search_vector @@ plainto_tsquery('english', :q)
        ORDER BY ts_rank(search_vector, plainto_tsquery('english', :q)) DESC
        LIMIT 1
    """), {"q": req.procedure_query})).first()
    if not proc:
        raise HTTPException(404, f"No procedure found matching: {req.procedure_query}")

    hospitals = []
    for slug in req.hospital_slugs:
        row = (await db.execute(text("""
            SELECT h.name, h.slug, h.city, h.state,
                   c.gross_charge, c.cash_price, c.min_negotiated, c.max_negotiated,
                   c.id::text as cid
            FROM hospitals h JOIN charges c ON c.hospital_id = h.id
            WHERE h.slug = :s AND c.procedure_id = :p
            LIMIT 1
        """), {"s": slug, "p": proc[0]})).first()
        if not row:
            continue
        payer_rate = None
        if req.payer:
            pr = (await db.execute(text("""
                SELECT negotiated_rate FROM payer_rates WHERE charge_id = :c AND payer_name ILIKE :p LIMIT 1
            """), {"c": row[8], "p": f"%{req.payer}%"})).first()
            if pr:
                payer_rate = pr[0]
        hospitals.append({
            "name": row[0], "slug": row[1], "city": row[2], "state": row[3],
            "gross_charge": row[4], "cash_price": row[5],
            "min_negotiated": row[6], "max_negotiated": row[7],
            "payer_rate": payer_rate,
        })

    if not hospitals:
        raise HTTPException(404, "No matching data for selected hospitals")

    # Savings calc
    cash_prices = [h["cash_price"] for h in hospitals if h.get("cash_price")]
    cheapest = None
    savings_max_min = None
    if cash_prices:
        min_price = min(cash_prices)
        max_price = max(cash_prices)
        savings_max_min = max_price - min_price
        for h in hospitals:
            if h.get("cash_price") == min_price:
                cheapest = h["name"]
                break

    return {
        "procedure": {"description": proc[1], "cpt_code": proc[2]},
        "hospitals": hospitals,
        "savings": {"max_vs_min_cash": savings_max_min, "cheapest_hospital": cheapest},
    }
