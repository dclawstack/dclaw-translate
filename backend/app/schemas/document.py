from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    original_path: str
    translated_path: str | None
    file_type: str
    file_size: int
    source_lang: str
    target_lang: str
    status: str
    page_count: int | None
    word_count: int | None
    error_message: str | None
    translation_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class DocumentList(BaseModel):
    items: list[DocumentResponse]
    total: int


class DocumentUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    file_type: str
    file_size: int
    status: str
    source_lang: str
    target_lang: str
    created_at: datetime
