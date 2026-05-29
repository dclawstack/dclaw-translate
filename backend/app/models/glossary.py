from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.utils import utc_now
from app.models.base import Base


class GlossaryTerm(Base):
    __tablename__ = "glossary_terms"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    term: Mapped[str] = mapped_column(String(500), nullable=False)
    translation: Mapped[str] = mapped_column(String(500), nullable=False)
    source_lang: Mapped[str] = mapped_column(String(10), nullable=False)
    target_lang: Mapped[str] = mapped_column(String(10), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(100), nullable=True)
    context_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    __table_args__ = (
        UniqueConstraint("term", "source_lang", "target_lang", name="uq_glossary_term_lang"),
    )
