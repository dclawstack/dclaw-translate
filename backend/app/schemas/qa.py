from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class QACheckResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    translation_id: uuid.UUID
    check_type: str
    severity: str
    message: str
    source_segment: Optional[str] = None
    translated_segment: Optional[str] = None
    suggestion: Optional[str] = None
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    created_at: datetime


class QAReportResponse(BaseModel):
    translation_id: uuid.UUID
    checks: list[QACheckResponse]
    error_count: int
    warning_count: int
    info_count: int
    unresolved_count: int


class ReviewCreate(BaseModel):
    translation_id: uuid.UUID
    reviewer_name: str
    comments: Optional[str] = None


class ReviewUpdate(BaseModel):
    status: Optional[str] = None
    comments: Optional[str] = None
    score: Optional[int] = None

    @field_validator("score")
    @classmethod
    def score_range(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("score must be between 1 and 5")
        return v


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    translation_id: uuid.UUID
    reviewer_name: str
    status: str
    comments: Optional[str] = None
    score: Optional[int] = None
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ReviewList(BaseModel):
    items: list[ReviewResponse]
    total: int
