from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TranslateRequest(BaseModel):
    source_text: str
    source_lang: str
    target_lang: str
    tone: str | None = None
    domain: str | None = None
    provider_id: uuid.UUID | None = None


class TranslationSegmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    segment_index: int
    source_segment: str
    translated_segment: str | None
    is_confirmed: bool


class TranslationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_text: str
    translated_text: str | None
    source_lang: str
    target_lang: str
    tone: str | None
    domain: str | None
    confidence_score: float | None
    status: str
    word_count: int | None
    created_at: datetime
    updated_at: datetime
    segments: list[TranslationSegmentResponse]
    provider_id: uuid.UUID | None


class TranslationListResponse(BaseModel):
    items: list[TranslationResponse]
    total: int


class TranslationSegmentUpdate(BaseModel):
    segment_id: uuid.UUID
    translated_segment: str
    is_confirmed: bool | None = None
