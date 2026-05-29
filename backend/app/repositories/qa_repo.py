from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.utils import utc_now
from app.models.qa_check import QACheck
from app.models.review import Review
from app.repositories.base_repo import BaseRepository


class QARepository(BaseRepository[QACheck]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db, QACheck)

    async def get_by_translation(self, translation_id: uuid.UUID) -> list[QACheck]:
        result = await self.db.execute(
            select(QACheck)
            .where(QACheck.translation_id == translation_id)
            .order_by(QACheck.created_at)
        )
        return list(result.scalars().all())

    async def bulk_create(self, checks: list[QACheck]) -> list[QACheck]:
        for check in checks:
            self.db.add(check)
        await self.db.commit()
        for check in checks:
            await self.db.refresh(check)
        return checks

    async def resolve(self, check_id: uuid.UUID) -> QACheck | None:
        check = await self.get_by_id(check_id)
        if check is None:
            return None
        check.is_resolved = True
        check.resolved_at = utc_now()
        await self.db.commit()
        await self.db.refresh(check)
        return check

    async def delete_by_translation(self, translation_id: uuid.UUID) -> None:
        checks = await self.get_by_translation(translation_id)
        for check in checks:
            await self.db.delete(check)
        await self.db.commit()


class ReviewRepository(BaseRepository[Review]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db, Review)

    async def list_all(  # type: ignore[override]
        self,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Review], int]:
        from sqlalchemy import func

        query = select(Review)
        if status:
            query = query.where(Review.status == status)

        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        result = await self.db.execute(
            query.order_by(Review.assigned_at.desc()).limit(limit).offset(offset)
        )
        return list(result.scalars().all()), total

    async def get_pending_queue(self) -> list[Review]:
        result = await self.db.execute(
            select(Review)
            .where(Review.status.in_(["pending", "in_review"]))
            .order_by(Review.assigned_at)
        )
        return list(result.scalars().all())

    async def get_by_translation(self, translation_id: uuid.UUID) -> list[Review]:
        result = await self.db.execute(
            select(Review)
            .where(Review.translation_id == translation_id)
            .order_by(Review.created_at.desc())
        )
        return list(result.scalars().all())

    async def update(self, review: Review) -> Review:
        await self.db.commit()
        await self.db.refresh(review)
        return review
