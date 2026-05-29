from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.translation_repo import TranslationRepository, TranslationSegmentRepository
from app.schemas.translation import (
    TranslateRequest,
    TranslationListResponse,
    TranslationResponse,
    TranslationSegmentUpdate,
)
from app.services.translation_service import TranslationService

logger = structlog.get_logger(__name__)
router = APIRouter()

_service = TranslationService()


@router.get("/", response_model=TranslationListResponse)
async def list_translations(
    source_lang: str | None = Query(None),
    target_lang: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> TranslationListResponse:
    repo = TranslationRepository(db)
    items, total = await repo.list_with_filters(
        source_lang=source_lang,
        target_lang=target_lang,
        status=status,
        limit=limit,
        offset=offset,
    )
    return TranslationListResponse(
        items=[TranslationResponse.model_validate(t) for t in items],
        total=total,
    )


@router.post("/", response_model=TranslationResponse, status_code=201)
async def create_translation(
    body: TranslateRequest,
    db: AsyncSession = Depends(get_db),
) -> TranslationResponse:
    translation = await _service.create_translation(db, body)
    return TranslationResponse.model_validate(translation)


@router.get("/{translation_id}", response_model=TranslationResponse)
async def get_translation(
    translation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> TranslationResponse:
    repo = TranslationRepository(db)
    translation = await repo.get_with_segments(translation_id)
    if translation is None:
        raise HTTPException(status_code=404, detail="Translation not found")
    return TranslationResponse.model_validate(translation)


@router.put("/{translation_id}", response_model=TranslationResponse)
async def update_translation_segments(
    translation_id: uuid.UUID,
    body: list[TranslationSegmentUpdate],
    db: AsyncSession = Depends(get_db),
) -> TranslationResponse:
    repo = TranslationRepository(db)
    seg_repo = TranslationSegmentRepository(db)

    translation = await repo.get_by_id(translation_id)
    if translation is None:
        raise HTTPException(status_code=404, detail="Translation not found")

    for update in body:
        seg = await seg_repo.get_by_id(update.segment_id)
        if seg is None or seg.translation_id != translation_id:
            raise HTTPException(
                status_code=404, detail=f"Segment {update.segment_id} not found"
            )
        seg.translated_segment = update.translated_segment
        if update.is_confirmed is not None:
            seg.is_confirmed = update.is_confirmed

    await db.commit()
    await db.refresh(translation)
    return TranslationResponse.model_validate(translation)


@router.delete("/{translation_id}")
async def delete_translation(
    translation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = TranslationRepository(db)
    translation = await repo.get_by_id(translation_id)
    if translation is None:
        raise HTTPException(status_code=404, detail="Translation not found")
    await repo.delete(translation)
    return {"message": "deleted"}


@router.post("/{translation_id}/retry", response_model=TranslationResponse)
async def retry_translation(
    translation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> TranslationResponse:
    translation = await _service.retry_translation(db, translation_id)
    if translation is None:
        raise HTTPException(status_code=404, detail="Translation not found")
    return TranslationResponse.model_validate(translation)


@router.post("/segments/{segment_id}/alternative", response_model=dict)
async def get_alternative_segment(
    segment_id: uuid.UUID,
    provider_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    segment = await _service.get_alternative_segment(db, segment_id, provider_id)
    if segment is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    return {
        "id": str(segment.id),
        "segment_index": segment.segment_index,
        "source_segment": segment.source_segment,
        "translated_segment": segment.translated_segment,
        "is_confirmed": segment.is_confirmed,
    }
