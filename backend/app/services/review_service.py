from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.utils import utc_now
from app.models.review import Review
from app.repositories.qa_repo import ReviewRepository


class ReviewService:
    async def assign_review(
        self,
        db: AsyncSession,
        translation_id: uuid.UUID,
        reviewer_name: str,
        comments: Optional[str] = None,
    ) -> Review:
        repo = ReviewRepository(db)
        review = Review(
            translation_id=translation_id,
            reviewer_name=reviewer_name,
            status="pending",
            comments=comments,
        )
        return await repo.create(review)

    async def update_review(
        self,
        db: AsyncSession,
        review_id: uuid.UUID,
        status: Optional[str] = None,
        comments: Optional[str] = None,
        score: Optional[int] = None,
    ) -> Review | None:
        repo = ReviewRepository(db)
        review = await repo.get_by_id(review_id)
        if review is None:
            return None

        if status is not None:
            review.status = status
            if status in ("approved", "rejected"):
                review.completed_at = utc_now()
        if comments is not None:
            review.comments = comments
        if score is not None:
            review.score = score

        return await repo.update(review)

    async def get_queue(self, db: AsyncSession) -> list[Review]:
        repo = ReviewRepository(db)
        return await repo.get_pending_queue()
