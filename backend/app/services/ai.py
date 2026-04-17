"""Claude AI service. Reads API key from settings service at call time (never at import)."""
import json
import logging
from typing import Any
import anthropic
import redis
from fastapi import HTTPException
from sqlalchemy.orm import Session as SyncSession
from sqlalchemy import text
from app.core.config import settings as base_settings
from app.core.database import get_sync_db
from app.services.settings import get_setting

logger = logging.getLogger(__name__)

redis_client = redis.from_url(base_settings.REDIS_URL)

SYSTEM_PROMPT = """You are a helpful assistant for ClearPrice, a hospital price transparency tool.
You help patients understand hospital pricing data in plain, non-technical language.
You never give medical advice. You never recommend specific hospitals.
When discussing prices, always note that final patient cost depends on their specific
insurance plan, deductible, and out-of-pocket maximum.
Always be factual, cite specific numbers from the data provided, and be concise."""

VALID_CATEGORIES = [
    "Radiology", "Surgery", "Emergency", "Laboratory", "Pharmacy",
    "Cardiology", "Orthopedics", "Obstetrics", "Oncology", "Neurology",
    "Physical Therapy", "Mental Health", "Anesthesia", "ICU/Critical Care",
    "Preventive Care", "Other",
]


def _get_claude_client(db: SyncSession | None = None) -> tuple[anthropic.Anthropic, str]:
    api_key = get_setting("anthropic_api_key", db)
    model = get_setting("claude_model", db) or "claude-sonnet-4-6"
    if not api_key:
        raise HTTPException(
            503,
            "AI features not configured. Set the Anthropic API key in Admin Settings -> AI Configuration."
        )
    return anthropic.Anthropic(api_key=api_key), model


def _wrap_claude_errors(func):
    def inner(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except anthropic.AuthenticationError:
            raise HTTPException(503, "Invalid Anthropic API key. Update it in Admin Settings -> AI Configuration.")
        except anthropic.RateLimitError:
            raise HTTPException(429, "Claude API rate limit exceeded. Try again later.")
        except anthropic.APIConnectionError:
            raise HTTPException(503, "Could not connect to Claude API.")
        except anthropic.APIStatusError as e:
            logger.error(f"Claude API error: {e}")
            raise HTTPException(500, "AI service error.")
    return inner


def build_question_context(db: SyncSession, question: str, hospital_slug: str | None = None) -> dict:
    # Similarity search on procedures
    procs = db.execute(
        text("""
            SELECT id::text, description, cpt_code
            FROM procedures
            WHERE description ILIKE :q OR cpt_code = :cpt
            ORDER BY similarity(description, :qbare) DESC NULLS LAST
            LIMIT 5
        """),
        {"q": f"%{question[:100]}%", "cpt": question.strip()[:20], "qbare": question[:100]},
    ).fetchall()
    matched = []
    for p in procs:
        pid = p[0]
        # Fetch top 10 charges for this procedure
        where_clause = "c.procedure_id = :pid"
        params: dict[str, Any] = {"pid": pid}
        if hospital_slug:
            where_clause += " AND h.slug = :slug"
            params["slug"] = hospital_slug
        charges = db.execute(
            text(f"""
                SELECT h.name, h.slug, h.city, h.state,
                       c.gross_charge, c.cash_price, c.min_negotiated, c.max_negotiated
                FROM charges c JOIN hospitals h ON c.hospital_id = h.id
                WHERE {where_clause}
                ORDER BY c.cash_price NULLS LAST
                LIMIT 10
            """),
            params,
        ).fetchall()
        matched.append({
            "description": p[1],
            "cpt_code": p[2],
            "charges": [
                {
                    "hospital": c[0], "slug": c[1], "city": c[2], "state": c[3],
                    "gross_charge": c[4], "cash_price": c[5],
                    "min_negotiated": c[6], "max_negotiated": c[7],
                } for c in charges
            ]
        })
    return {
        "matched_procedures": matched,
        "data_note": "Prices are standard charges as published in hospital machine-readable files. Final patient cost varies by insurance.",
    }


@_wrap_claude_errors
def ask_question(question: str, context_data: dict, db: SyncSession) -> str:
    client, model = _get_claude_client(db)
    ctx_json = json.dumps(context_data, default=str)
    msg = client.messages.create(
        model=model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"Question: {question}\n\nData:\n{ctx_json}"
        }],
    )
    return "\n".join(b.text for b in msg.content if b.type == "text")


@_wrap_claude_errors
def generate_hospital_summary(db: SyncSession, hospital_slug: str) -> str:
    cache_key = f"ai:hospital_summary:{hospital_slug}"
    cached = redis_client.get(cache_key)
    if cached:
        return cached.decode("utf-8")
    client, model = _get_claude_client(db)
    hosp_data = db.execute(
        text("""SELECT h.name, h.city, h.state, h.row_count,
                       COUNT(DISTINCT c.id) as charge_count,
                       MIN(c.cash_price) as min_price,
                       MAX(c.cash_price) as max_price,
                       COUNT(DISTINCT pr.payer_name) as payer_count
                FROM hospitals h
                LEFT JOIN charges c ON c.hospital_id = h.id
                LEFT JOIN payer_rates pr ON pr.charge_id = c.id
                WHERE h.slug = :s
                GROUP BY h.id"""),
        {"s": hospital_slug},
    ).first()
    if not hosp_data:
        raise HTTPException(404, "Hospital not found")
    top_procs = db.execute(
        text("""SELECT p.description, c.gross_charge, c.cash_price
                FROM charges c JOIN procedures p ON c.procedure_id = p.id
                JOIN hospitals h ON c.hospital_id = h.id
                WHERE h.slug = :s AND c.gross_charge IS NOT NULL
                ORDER BY c.gross_charge DESC LIMIT 20"""),
        {"s": hospital_slug},
    ).fetchall()
    context = {
        "name": hosp_data[0],
        "location": f"{hosp_data[1]}, {hosp_data[2]}",
        "procedure_count": hosp_data[3],
        "charge_count": hosp_data[4],
        "price_range": {"min": hosp_data[5], "max": hosp_data[6]},
        "payers": hosp_data[7],
        "top_procedures": [{"desc": p[0], "gross": p[1], "cash": p[2]} for p in top_procs],
    }
    msg = client.messages.create(
        model=model,
        max_tokens=768,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": (
                f"Write a 3-paragraph plain-English summary of this hospital's pricing. "
                f"Cover: (1) hospital overview, (2) pricing landscape, (3) notable observations. "
                f"Data:\n{json.dumps(context, default=str)}"
            ),
        }],
    )
    text_result = "\n".join(b.text for b in msg.content if b.type == "text")
    redis_client.setex(cache_key, 24 * 3600, text_result)
    return text_result


@_wrap_claude_errors
def explain_comparison(comparison_result: dict, db: SyncSession) -> str:
    client, model = _get_claude_client(db)
    msg = client.messages.create(
        model=model,
        max_tokens=768,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": (
                f"Write a 2-3 paragraph plain-English analysis of this hospital price comparison. "
                f"Identify the cheapest, estimate potential savings, discuss cash vs insured pricing, "
                f"and include a disclaimer about insurance affecting final costs. "
                f"Data:\n{json.dumps(comparison_result, default=str)}"
            ),
        }],
    )
    return "\n".join(b.text for b in msg.content if b.type == "text")


@_wrap_claude_errors
def auto_tag_procedures_batch(limit: int = 200):
    """Assign categories to untagged procedures. Runs async as Celery task."""
    categories_str = ", ".join(VALID_CATEGORIES)
    with get_sync_db() as db:
        procs = db.execute(
            text("SELECT id::text, description, cpt_code FROM procedures WHERE category IS NULL LIMIT :l"),
            {"l": limit},
        ).fetchall()
        if not procs:
            return {"tagged": 0}
        client, model = _get_claude_client(db)
        tagged = 0
        # Process in batches of 20
        for i in range(0, len(procs), 20):
            batch = procs[i:i+20]
            items = [{"id": p[0], "description": p[1][:200], "cpt": p[2] or ""} for p in batch]
            prompt = (
                f"Classify each procedure into ONE of these categories: {categories_str}. "
                f"Return JSON object mapping id -> category. No explanation.\n\n"
                f"Procedures: {json.dumps(items)}"
            )
            try:
                msg = client.messages.create(
                    model=model,
                    max_tokens=2048,
                    messages=[{"role": "user", "content": prompt}],
                )
                raw = "\n".join(b.text for b in msg.content if b.type == "text")
                # Extract JSON object
                start = raw.find("{")
                end = raw.rfind("}")
                if start >= 0 and end > start:
                    mapping = json.loads(raw[start:end+1])
                    for pid, cat in mapping.items():
                        if cat in VALID_CATEGORIES:
                            db.execute(
                                text("UPDATE procedures SET category = :c WHERE id = :id"),
                                {"c": cat, "id": pid},
                            )
                            tagged += 1
                    db.commit()
            except Exception as e:
                logger.warning(f"Batch tag failed: {e}")
                db.rollback()
        return {"tagged": tagged}
