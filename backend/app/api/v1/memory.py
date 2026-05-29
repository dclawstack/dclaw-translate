from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.translation_memory_repo import TranslationMemoryRepository
from app.schemas.glossary import (
    TMList,
    TMMatchResponse,
    TMSearchRequest,
    TMStats,
)

router = APIRouter()


@router.get("/stats", response_model=TMStats)
async def get_stats(db: AsyncSession = Depends(get_db)) -> TMStats:
    repo = TranslationMemoryRepository(db)
    stats = await repo.get_stats()
    return TMStats(**stats)


@router.post("/search", response_model=list[TMMatchResponse])
async def search_memory(
    body: TMSearchRequest, db: AsyncSession = Depends(get_db)
) -> list[TMMatchResponse]:
    repo = TranslationMemoryRepository(db)
    matches = await repo.fuzzy_search(
        body.source_text,
        body.source_lang,
        body.target_lang,
        body.threshold,
        body.limit,
    )
    return [TMMatchResponse(**m) for m in matches]


@router.get("/", response_model=TMList)
async def list_memory(
    source_lang: str | None = None,
    target_lang: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> TMList:
    repo = TranslationMemoryRepository(db)
    items, total = await repo.list_all(source_lang, target_lang, limit, offset)
    return TMList(items=items, total=total)


@router.delete("/{entry_id}")
async def delete_entry(
    entry_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> dict:
    repo = TranslationMemoryRepository(db)
    entry = await repo.get_by_id(entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="TM entry not found")
    await repo.delete(entry)
    return {"message": "deleted"}
