from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ── Glossary ──────────────────────────────────────────────────────────────────

class GlossaryTermCreate(BaseModel):
    term: str
    translation: str
    source_lang: str
    target_lang: str
    domain: str | None = None
    context_note: str | None = None


class GlossaryTermUpdate(BaseModel):
    translation: str | None = None
    domain: str | None = None
    context_note: str | None = None
    is_active: bool | None = None


class GlossaryTermResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    term: str
    translation: str
    source_lang: str
    target_lang: str
    domain: str | None
    context_note: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class GlossaryTermList(BaseModel):
    items: list[GlossaryTermResponse]
    total: int


class BulkGlossaryCreate(BaseModel):
    terms: list[GlossaryTermCreate]


class BulkGlossaryResponse(BaseModel):
    created: int
    skipped: int


# ── Translation Memory ────────────────────────────────────────────────────────

class TMSearchRequest(BaseModel):
    source_text: str
    source_lang: str
    target_lang: str
    threshold: float = 0.3
    limit: int = 5


class TMMatchResponse(BaseModel):
    id: uuid.UUID
    source_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    domain: str | None
    similarity: float
    usage_count: int


class TMEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    domain: str | None
    usage_count: int
    last_used_at: datetime | None
    translation_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class TMList(BaseModel):
    items: list[TMEntryResponse]
    total: int


class TMStats(BaseModel):
    total_entries: int
    total_usage: int
    top_domains: list[dict]
