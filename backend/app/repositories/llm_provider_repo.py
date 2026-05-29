from __future__ import annotations

import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.llm_provider import LLMProvider
from app.repositories.base_repo import BaseRepository


class LLMProviderRepository(BaseRepository[LLMProvider]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db, LLMProvider)

    async def get_by_name(self, name: str) -> LLMProvider | None:
        result = await self.db.execute(
            select(LLMProvider).where(LLMProvider.name == name)
        )
        return result.scalar_one_or_none()

    async def get_default(self) -> LLMProvider | None:
        result = await self.db.execute(
            select(LLMProvider).where(LLMProvider.is_default.is_(True)).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_active(self) -> list[LLMProvider]:
        result = await self.db.execute(
            select(LLMProvider).where(LLMProvider.is_active.is_(True))
        )
        return list(result.scalars().all())

    async def set_default(self, provider_id: uuid.UUID) -> LLMProvider | None:
        await self.db.execute(
            update(LLMProvider).values(is_default=False)
        )
        await self.db.execute(
            update(LLMProvider)
            .where(LLMProvider.id == provider_id)
            .values(is_default=True)
        )
        await self.db.commit()
        return await self.get_by_id(provider_id)
