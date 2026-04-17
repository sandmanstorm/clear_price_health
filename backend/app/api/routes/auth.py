import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slowapi import Limiter
from slowapi.util import get_remote_address
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    get_current_user, verify_token,
)
from app.models import User, Session as UserSession

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
serializer = URLSafeTimedSerializer(settings.APP_SECRET_KEY)


class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class RefreshReq(BaseModel):
    refresh_token: str


class VerifyReq(BaseModel):
    token: str


class ForgotReq(BaseModel):
    email: EmailStr


class ResetReq(BaseModel):
    token: str
    new_password: str


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/register")
async def register(req: RegisterReq, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(select(User).where(User.email == req.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Email already registered")
    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        role="user",
        is_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    # Queue verification (optional, will fail silently if SMTP not configured)
    try:
        from app.tasks.email_tasks import send_verification_email
        send_verification_email.delay(str(user.id))
    except Exception:
        pass
    return {"message": "Account created. Check your email to verify."}


@router.post("/verify-email")
async def verify_email(req: VerifyReq, db: AsyncSession = Depends(get_db)):
    try:
        user_id = serializer.loads(req.token, salt="email-verify", max_age=86400)
    except SignatureExpired:
        raise HTTPException(400, "Token expired")
    except BadSignature:
        raise HTTPException(400, "Invalid token")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_verified = True
    await db.commit()
    access = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    refresh = create_refresh_token({"sub": str(user.id)})
    return {"access_token": access, "refresh_token": refresh, "user": {
        "id": str(user.id), "email": user.email, "full_name": user.full_name, "role": user.role,
    }}


@router.post("/login")
async def login(req: LoginReq, request: Request, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == req.email))).scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    if not user.is_active:
        raise HTTPException(403, "Account disabled")
    access = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    refresh = create_refresh_token({"sub": str(user.id)})
    sess = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh),
        user_agent=request.headers.get("user-agent", "")[:500],
        ip_address=request.client.host if request.client else None,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(sess)
    await db.commit()
    return {"access_token": access, "refresh_token": refresh, "user": {
        "id": str(user.id), "email": user.email, "full_name": user.full_name, "role": user.role,
    }}


@router.post("/refresh")
async def refresh_token(req: RefreshReq, db: AsyncSession = Depends(get_db)):
    payload = verify_token(req.refresh_token, token_type="refresh")
    user_id = payload.get("sub")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(401, "Invalid user")
    access = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    new_refresh = create_refresh_token({"sub": str(user.id)})
    return {"access_token": access, "refresh_token": new_refresh}


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Simple: remove all sessions for the user
    await db.execute(
        UserSession.__table__.delete().where(UserSession.user_id == current_user.id)
    )
    await db.commit()
    return {"ok": True}


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id), "email": current_user.email,
        "full_name": current_user.full_name, "role": current_user.role,
        "is_verified": current_user.is_verified,
    }


@router.post("/forgot-password")
async def forgot(req: ForgotReq, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == req.email))).scalar_one_or_none()
    if user:
        try:
            from app.tasks.email_tasks import send_password_reset_email
            send_password_reset_email.delay(str(user.id))
        except Exception:
            pass
    return {"message": "If an account exists, a reset email has been sent."}


@router.post("/reset-password")
async def reset_password(req: ResetReq, db: AsyncSession = Depends(get_db)):
    try:
        user_id = serializer.loads(req.token, salt="password-reset", max_age=3600)
    except SignatureExpired:
        raise HTTPException(400, "Token expired")
    except BadSignature:
        raise HTTPException(400, "Invalid token")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    user.hashed_password = hash_password(req.new_password)
    await db.execute(UserSession.__table__.delete().where(UserSession.user_id == user.id))
    await db.commit()
    return {"ok": True}


# Google OAuth placeholder endpoints (dynamic config)
@router.get("/google")
async def google_auth():
    raise HTTPException(503, "Google OAuth configuration pending. Enable in Admin Settings.")


@router.get("/google/callback")
async def google_callback():
    raise HTTPException(503, "Google OAuth configuration pending.")
