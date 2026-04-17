from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from app.core.config import settings


class Base(DeclarativeBase):
    pass


async_engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

AsyncSessionLocal = sessionmaker(  # type: ignore[call-overload]
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


sync_engine = create_engine(
    settings.DATABASE_URL_SYNC,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

SyncSessionLocal = sessionmaker(bind=sync_engine, autoflush=False, autocommit=False)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


@contextmanager
def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()
