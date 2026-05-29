from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.glossary import GlossaryTerm
from app.repositories.glossary_repo import GlossaryRepository
from app.schemas.glossary import (
    BulkGlossaryCreate,
    BulkGlossaryResponse,
    GlossaryTermCreate,
    GlossaryTermList,
    GlossaryTermResponse,
    GlossaryTermUpdate,
)

router = APIRouter()


@router.get("/domains", response_model=list[str])
async def list_domains(db: AsyncSession = Depends(get_db)) -> list[str]:
    repo = GlossaryRepository(db)
    return await repo.list_domains()


@router.post("/bulk", response_model=BulkGlossaryResponse, status_code=201)
async def bulk_create_terms(
    body: BulkGlossaryCreate, db: AsyncSession = Depends(get_db)
) -> BulkGlossaryResponse:
    repo = GlossaryRepository(db)
    terms = [GlossaryTerm(**t.model_dump()) for t in body.terms]
    created, skipped = await repo.bulk_create(terms)
    return BulkGlossaryResponse(created=created, skipped=skipped)


@router.get("/", response_model=GlossaryTermList)
async def list_terms(
    source_lang: str | None = None,
    target_lang: str | None = None,
    domain: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> GlossaryTermList:
    repo = GlossaryRepository(db)
    items, total = await repo.list_all(source_lang, target_lang, domain, limit, offset)
    return GlossaryTermList(items=items, total=total)


@router.post("/", response_model=GlossaryTermResponse, status_code=201)
async def create_term(
    body: GlossaryTermCreate, db: AsyncSession = Depends(get_db)
) -> GlossaryTermResponse:
    repo = GlossaryRepository(db)
    term = GlossaryTerm(**body.model_dump())
    created = await repo.create(term)
    return GlossaryTermResponse.model_validate(created)


@router.get("/{term_id}", response_model=GlossaryTermResponse)
async def get_term(
    term_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> GlossaryTermResponse:
    repo = GlossaryRepository(db)
    term = await repo.get_by_id(term_id)
    if term is None:
        raise HTTPException(status_code=404, detail="Glossary term not found")
    return GlossaryTermResponse.model_validate(term)


@router.put("/{term_id}", response_model=GlossaryTermResponse)
async def update_term(
    term_id: uuid.UUID,
    body: GlossaryTermUpdate,
    db: AsyncSession = Depends(get_db),
) -> GlossaryTermResponse:
    repo = GlossaryRepository(db)
    term = await repo.get_by_id(term_id)
    if term is None:
        raise HTTPException(status_code=404, detail="Glossary term not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(term, field, value)
    updated = await repo.update(term)
    return GlossaryTermResponse.model_validate(updated)


@router.delete("/{term_id}")
async def delete_term(
    term_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> dict:
    repo = GlossaryRepository(db)
    term = await repo.get_by_id(term_id)
    if term is None:
        raise HTTPException(status_code=404, detail="Glossary term not found")
    await repo.delete(term)
    return {"message": "deleted"}
