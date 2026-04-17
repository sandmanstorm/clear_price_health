from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db, get_sync_db
from app.services.settings import get_setting
from app.services import ai as ai_service

router = APIRouter()

DISCLAIMER = (
    "Prices shown are standard charges. Your actual cost depends on your insurance plan, "
    "deductible, and benefits. Contact your insurer for an accurate estimate."
)


class AskReq(BaseModel):
    question: str
    hospital_slug: str | None = None


class ExplainReq(BaseModel):
    comparison: dict


@router.post("/ask")
async def ask(req: AskReq):
    with get_sync_db() as db:
        if get_setting("ai_enabled", db) != "true":
            raise HTTPException(503, "AI features are disabled.")
        context = ai_service.build_question_context(db, req.question, req.hospital_slug)
        answer = ai_service.ask_question(req.question, context, db)
        db.execute(
            __import__("sqlalchemy").text(
                "INSERT INTO ai_conversations (id, question, answer, hospital_slug, context_snapshot) "
                "VALUES (gen_random_uuid(), :q, :a, :s, :ctx::jsonb)"
            ),
            {"q": req.question, "a": answer, "s": req.hospital_slug,
             "ctx": __import__("json").dumps(context, default=str)},
        )
        db.commit()
        return {
            "answer": answer,
            "procedures_referenced": [p["description"] for p in context.get("matched_procedures", [])],
            "disclaimer": DISCLAIMER,
        }


@router.get("/hospital/{slug}/summary")
async def hospital_summary(slug: str):
    with get_sync_db() as db:
        if get_setting("ai_enabled", db) != "true":
            raise HTTPException(503, "AI features are disabled.")
        summary = ai_service.generate_hospital_summary(db, slug)
        return {"summary": summary, "hospital_slug": slug}


@router.post("/compare/explain")
async def compare_explain(req: ExplainReq):
    with get_sync_db() as db:
        if get_setting("ai_enabled", db) != "true":
            raise HTTPException(503, "AI features are disabled.")
        explanation = ai_service.explain_comparison(req.comparison, db)
        return {"explanation": explanation}


@router.get("/status")
async def ai_status():
    with get_sync_db() as db:
        api_key = get_setting("anthropic_api_key", db)
        return {
            "enabled": get_setting("ai_enabled", db) == "true",
            "model": get_setting("claude_model", db) or "claude-sonnet-4-6",
            "api_key_configured": bool(api_key),
            "rate_limit": "20/min",
        }
