from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.document import Document
from app.models.glossary import GlossaryTerm
from app.models.qa_check import QACheck
from app.models.review import Review
from app.models.translation import Translation
from app.models.translation_memory import TranslationMemory
from app.services import seed as seed_service

router = APIRouter()


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    # Simple counts
    translations_count = (await db.execute(select(func.count(Translation.id)))).scalar_one()
    documents_count = (await db.execute(select(func.count(Document.id)))).scalar_one()
    glossary_count = (await db.execute(select(func.count(GlossaryTerm.id)))).scalar_one()
    reviews_pending_count = (
        await db.execute(
            select(func.count(Review.id)).where(Review.status == "pending")
        )
    ).scalar_one()
    tm_entries_count = (
        await db.execute(select(func.count(TranslationMemory.id)))
    ).scalar_one()

    # Recent translations (last 6)
    recent_translations_rows = (
        await db.execute(
            select(Translation)
            .order_by(Translation.created_at.desc())
            .limit(6)
        )
    ).scalars().all()
    recent_translations = [
        {
            "id": str(t.id),
            "source_text": t.source_text[:50],
            "status": t.status,
            "source_lang": t.source_lang,
            "target_lang": t.target_lang,
            "created_at": t.created_at.isoformat(),
        }
        for t in recent_translations_rows
    ]

    # Recent documents (last 6)
    recent_documents_rows = (
        await db.execute(
            select(Document)
            .order_by(Document.created_at.desc())
            .limit(6)
        )
    ).scalars().all()
    recent_documents = [
        {
            "id": str(d.id),
            "filename": d.filename,
            "file_type": d.file_type,
            "status": d.status,
            "created_at": d.created_at.isoformat(),
        }
        for d in recent_documents_rows
    ]

    # QA summary
    qa_errors = (
        await db.execute(
            select(func.count(QACheck.id)).where(
                QACheck.severity == "error", QACheck.is_resolved == False  # noqa: E712
            )
        )
    ).scalar_one()
    qa_warnings = (
        await db.execute(
            select(func.count(QACheck.id)).where(
                QACheck.severity == "warning", QACheck.is_resolved == False  # noqa: E712
            )
        )
    ).scalar_one()
    qa_resolved = (
        await db.execute(
            select(func.count(QACheck.id)).where(QACheck.is_resolved == True)  # noqa: E712
        )
    ).scalar_one()

    # Top 5 language pairs from translations
    lang_pairs_rows = (
        await db.execute(
            select(
                Translation.source_lang,
                Translation.target_lang,
                func.count(Translation.id).label("count"),
            )
            .group_by(Translation.source_lang, Translation.target_lang)
            .order_by(func.count(Translation.id).desc())
            .limit(5)
        )
    ).all()
    language_pairs = [
        {"source": row.source_lang, "target": row.target_lang, "count": row.count}
        for row in lang_pairs_rows
    ]

    return {
        "translations_count": translations_count,
        "documents_count": documents_count,
        "glossary_count": glossary_count,
        "reviews_pending_count": reviews_pending_count,
        "tm_entries_count": tm_entries_count,
        "recent_translations": recent_translations,
        "recent_documents": recent_documents,
        "qa_summary": {
            "errors": qa_errors,
            "warnings": qa_warnings,
            "resolved": qa_resolved,
        },
        "language_pairs": language_pairs,
    }


@router.post("/seed")
async def seed_demo_data(db: AsyncSession = Depends(get_db)):
    counts = await seed_service.seed_all(db)
    return {"message": "success", "inserted": counts}


@router.post("/seed/clear")
async def clear_demo_data(db: AsyncSession = Depends(get_db)):
    counts = await seed_service.clear_all(db)
    return {"message": "success", "deleted": counts}
