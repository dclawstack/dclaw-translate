from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.utils import utc_now
from app.models.base import Base


class Translation(Base):
    __tablename__ = "translations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    translated_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_lang: Mapped[str] = mapped_column(String(10), nullable=False)
    target_lang: Mapped[str] = mapped_column(String(10), nullable=False)
    tone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    domain: Mapped[str | None] = mapped_column(String(100), nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    provider_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("llm_providers.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="pending")
    word_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    provider: Mapped["app.models.llm_provider.LLMProvider | None"] = relationship(
        "LLMProvider", lazy="selectin"
    )
    segments: Mapped[list[TranslationSegment]] = relationship(
        "TranslationSegment",
        back_populates="translation",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="TranslationSegment.segment_index",
    )


class TranslationSegment(Base):
    __tablename__ = "translation_segments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    translation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("translations.id", ondelete="CASCADE"), nullable=False
    )
    segment_index: Mapped[int] = mapped_column(Integer, nullable=False)
    source_segment: Mapped[str] = mapped_column(Text, nullable=False)
    translated_segment: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)

    translation: Mapped[Translation] = relationship(
        "Translation", back_populates="segments"
    )
