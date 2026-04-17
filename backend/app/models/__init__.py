"""All SQLAlchemy models in one file for simplicity."""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float,
    LargeBinary, func, Index, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from sqlalchemy.orm import relationship
from app.core.database import Base


def uuid_pk():
    return Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class HospitalSystem(Base):
    __tablename__ = "hospital_systems"
    id = uuid_pk()
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    website = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    hospitals = relationship("Hospital", back_populates="system")


class Hospital(Base):
    __tablename__ = "hospitals"
    id = uuid_pk()
    system_id = Column(UUID(as_uuid=True), ForeignKey("hospital_systems.id"))
    name = Column(String(500), nullable=False)
    slug = Column(String(500), unique=True, nullable=False)
    city = Column(String(255))
    state = Column(String(50))
    zip = Column(String(20))
    ein = Column(String(50))
    cms_id = Column(String(50))
    json_url = Column(String(1000))
    last_fetched = Column(DateTime(timezone=True))
    last_modified_header = Column(String(100))
    file_size_bytes = Column(Integer)
    row_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    system = relationship("HospitalSystem", back_populates="hospitals")
    __table_args__ = (
        Index("ix_hospitals_state", "state"),
        Index("ix_hospitals_city", "city"),
    )


class Procedure(Base):
    __tablename__ = "procedures"
    id = uuid_pk()
    cpt_code = Column(String(20))
    drg_code = Column(String(20))
    description = Column(Text, nullable=False)
    category = Column(String(100))
    search_vector = Column(TSVECTOR)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (
        Index("ix_procedures_cpt", "cpt_code"),
        Index("ix_procedures_search_vector", "search_vector", postgresql_using="gin"),
        Index("ix_procedures_description_trgm", "description", postgresql_using="gin",
              postgresql_ops={"description": "gin_trgm_ops"}),
    )


class Charge(Base):
    __tablename__ = "charges"
    id = uuid_pk()
    hospital_id = Column(UUID(as_uuid=True), ForeignKey("hospitals.id", ondelete="CASCADE"))
    procedure_id = Column(UUID(as_uuid=True), ForeignKey("procedures.id", ondelete="CASCADE"))
    gross_charge = Column(Float)
    cash_price = Column(Float)
    min_negotiated = Column(Float)
    max_negotiated = Column(Float)
    setting = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint("hospital_id", "procedure_id", "setting", name="uq_hospital_procedure_setting"),
        Index("ix_charges_hospital", "hospital_id"),
        Index("ix_charges_procedure", "procedure_id"),
    )


class PayerRate(Base):
    __tablename__ = "payer_rates"
    id = uuid_pk()
    charge_id = Column(UUID(as_uuid=True), ForeignKey("charges.id", ondelete="CASCADE"))
    payer_name = Column(String(255))
    plan_name = Column(String(255))
    negotiated_rate = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (
        Index("ix_payer_rates_charge", "charge_id"),
        Index("ix_payer_rates_payer", "payer_name"),
    )


class IngestLog(Base):
    __tablename__ = "ingest_log"
    id = uuid_pk()
    hospital_id = Column(UUID(as_uuid=True), ForeignKey("hospitals.id"))
    status = Column(String(20), default="pending")
    rows_imported = Column(Integer, default=0)
    duration_seconds = Column(Integer)
    error_message = Column(Text)
    ran_at = Column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"
    id = uuid_pk()
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255))
    full_name = Column(String(255))
    role = Column(String(20), default="user")
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    google_id = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Session(Base):
    __tablename__ = "sessions"
    id = uuid_pk()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    refresh_token_hash = Column(String(255))
    user_agent = Column(String(500))
    ip_address = Column(String(45))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))


class EmailSubscription(Base):
    __tablename__ = "email_subscriptions"
    id = uuid_pk()
    email = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    zip_code = Column(String(20))
    unsubscribe_token = Column(String(100), unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AiConversation(Base):
    __tablename__ = "ai_conversations"
    id = uuid_pk()
    session_id = Column(String(100))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    question = Column(Text, nullable=False)
    answer = Column(Text)
    context_snapshot = Column(JSONB)
    hospital_slug = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SystemSetting(Base):
    __tablename__ = "system_settings"
    id = uuid_pk()
    key = Column(String(100), unique=True, nullable=False)
    value_encrypted = Column(LargeBinary)
    value_plain = Column(Text)
    value_type = Column(String(20), default="string")
    description = Column(Text)
    is_sensitive = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
