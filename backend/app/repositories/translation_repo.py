from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.translation import Translation, TranslationSegment
from app.repositories.base_repo import BaseRepository


class TranslationRepository(BaseRepository[Translation]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db, Translation)

    async def list_with_filters(
        self,
        source_lang: str | None = None,
        target_lang: str | None = None,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Translation], int]:
        query = select(Translation)
        if source_lang:
            query = query.where(Translation.source_lang == source_lang)
        if target_lang:
            query = query.where(Translation.target_lang == target_lang)
        if status:
            query = query.where(Translation.status == status)

        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        result = await self.db.execute(
            query.order_by(Translation.created_at.desc()).limit(limit).offset(offset)
        )
        items = list(result.scalars().all())
        return items, total

    async def get_with_segments(self, translation_id: uuid.UUID) -> Translation | None:
        # segments loaded via lazy="selectin" automatically
        return await self.get_by_id(translation_id)


class TranslationSegmentRepository(BaseRepository[TranslationSegment]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db, TranslationSegment)

    async def get_by_translation(self, translation_id: uuid.UUID) -> list[TranslationSegment]:
        result = await self.db.execute(
            select(TranslationSegment)
            .where(TranslationSegment.translation_id == translation_id)
            .order_by(TranslationSegment.segment_index)
        )
        return list(result.scalars().all())
