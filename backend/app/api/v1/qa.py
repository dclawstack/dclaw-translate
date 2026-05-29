from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.qa_repo import QARepository, ReviewRepository
from app.schemas.qa import (
    QACheckResponse,
    QAReportResponse,
    ReviewCreate,
    ReviewList,
    ReviewResponse,
    ReviewUpdate,
)
from app.services.qa_engine import QAEngine
from app.services.review_service import ReviewService

router = APIRouter()

_qa_engine = QAEngine()
_review_service = ReviewService()


def _build_report(translation_id: uuid.UUID, checks: list) -> QAReportResponse:
    return QAReportResponse(
        translation_id=translation_id,
        checks=[QACheckResponse.model_validate(c) for c in checks],
        error_count=sum(1 for c in checks if c.severity == "error"),
        warning_count=sum(1 for c in checks if c.severity == "warning"),
        info_count=sum(1 for c in checks if c.severity == "info"),
        unresolved_count=sum(1 for c in checks if not c.is_resolved),
    )


# ── QA Checks ────────────────────────────────────────────────────────────────

@router.post("/run/{translation_id}", response_model=QAReportResponse)
async def run_qa_checks(
    translation_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> QAReportResponse:
    checks = await _qa_engine.run_checks_for_translation(db, translation_id)
    return _build_report(translation_id, checks)


@router.get("/report/{translation_id}", response_model=QAReportResponse)
async def get_qa_report(
    translation_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> QAReportResponse:
    repo = QARepository(db)
    checks = await repo.get_by_translation(translation_id)
    return _build_report(translation_id, checks)


@router.put("/checks/{check_id}/resolve", response_model=QACheckResponse)
async def resolve_check(
    check_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> QACheckResponse:
    repo = QARepository(db)
    check = await repo.resolve(check_id)
    if check is None:
        raise HTTPException(status_code=404, detail="QA check not found")
    return QACheckResponse.model_validate(check)


# ── Reviews ───────────────────────────────────────────────────────────────────

@router.post("/reviews", response_model=ReviewResponse, status_code=201)
async def create_review(
    body: ReviewCreate, db: AsyncSession = Depends(get_db)
) -> ReviewResponse:
    review = await _review_service.assign_review(
        db,
        translation_id=body.translation_id,
        reviewer_name=body.reviewer_name,
        comments=body.comments,
    )
    return ReviewResponse.model_validate(review)


@router.get("/reviews", response_model=ReviewList)
async def list_reviews(
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> ReviewList:
    repo = ReviewRepository(db)
    items, total = await repo.list_all(status=status, limit=limit, offset=offset)
    return ReviewList(items=items, total=total)


# IMPORTANT: /reviews/queue MUST be before /reviews/{review_id}
@router.get("/reviews/queue", response_model=list[ReviewResponse])
async def get_review_queue(db: AsyncSession = Depends(get_db)) -> list[ReviewResponse]:
    reviews = await _review_service.get_queue(db)
    return [ReviewResponse.model_validate(r) for r in reviews]


@router.get("/reviews/{review_id}", response_model=ReviewResponse)
async def get_review(
    review_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> ReviewResponse:
    repo = ReviewRepository(db)
    review = await repo.get_by_id(review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    return ReviewResponse.model_validate(review)


@router.put("/reviews/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: uuid.UUID,
    body: ReviewUpdate,
    db: AsyncSession = Depends(get_db),
) -> ReviewResponse:
    review = await _review_service.update_review(
        db,
        review_id=review_id,
        status=body.status,
        comments=body.comments,
        score=body.score,
    )
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    return ReviewResponse.model_validate(review)
