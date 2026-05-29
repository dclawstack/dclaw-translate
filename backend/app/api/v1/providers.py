from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.llm_provider import LLMProvider
from app.repositories.llm_provider_repo import LLMProviderRepository
from app.schemas.llm_provider import (
    LLMProviderCreate,
    LLMProviderList,
    LLMProviderResponse,
    LLMProviderUpdate,
)
from app.services.llm_service import LLMService

logger = structlog.get_logger(__name__)
router = APIRouter()


def _get_service() -> LLMService:
    return LLMService(settings)


@router.get("/", response_model=LLMProviderList)
async def list_providers(db: AsyncSession = Depends(get_db)) -> LLMProviderList:
    repo = LLMProviderRepository(db)
    items, total = await repo.list_all(limit=100, offset=0)
    return LLMProviderList(items=items, total=total)


@router.post("/", response_model=LLMProviderResponse, status_code=201)
async def create_provider(
    body: LLMProviderCreate, db: AsyncSession = Depends(get_db)
) -> LLMProviderResponse:
    repo = LLMProviderRepository(db)
    existing = await repo.get_by_name(body.name)
    if existing:
        raise HTTPException(status_code=409, detail="Provider name already exists")
    provider = LLMProvider(**body.model_dump())
    created = await repo.create(provider)
    return LLMProviderResponse.model_validate(created)


@router.get("/{provider_id}", response_model=LLMProviderResponse)
async def get_provider(provider_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> LLMProviderResponse:
    repo = LLMProviderRepository(db)
    provider = await repo.get_by_id(provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    return LLMProviderResponse.model_validate(provider)


@router.put("/{provider_id}", response_model=LLMProviderResponse)
async def update_provider(
    provider_id: uuid.UUID, body: LLMProviderUpdate, db: AsyncSession = Depends(get_db)
) -> LLMProviderResponse:
    repo = LLMProviderRepository(db)
    provider = await repo.get_by_id(provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(provider, field, value)
    updated = await repo.create(provider)
    return LLMProviderResponse.model_validate(updated)


@router.delete("/{provider_id}")
async def delete_provider(provider_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> dict:
    repo = LLMProviderRepository(db)
    provider = await repo.get_by_id(provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    await repo.delete(provider)
    return {"message": "deleted"}


@router.post("/{provider_id}/set-default", response_model=LLMProviderResponse)
async def set_default_provider(provider_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> LLMProviderResponse:
    repo = LLMProviderRepository(db)
    provider = await repo.get_by_id(provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    updated = await repo.set_default(provider_id)
    return LLMProviderResponse.model_validate(updated)


@router.post("/{provider_id}/test")
async def test_provider(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    service: LLMService = Depends(_get_service),
) -> dict:
    return await service.test_connection(db, provider_id)
