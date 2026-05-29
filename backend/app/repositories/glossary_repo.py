from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.utils import utc_now
from app.models.glossary import GlossaryTerm


class GlossaryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, term_id: uuid.UUID) -> GlossaryTerm | None:
        result = await self.db.execute(
            select(GlossaryTerm).where(GlossaryTerm.id == term_id)
        )
        return result.scalar_one_or_none()

    async def list_all(
        self,
        source_lang: str | None = None,
        target_lang: str | None = None,
        domain: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[GlossaryTerm], int]:
        query = select(GlossaryTerm)
        count_query = select(func.count()).select_from(GlossaryTerm)

        if source_lang is not None:
            query = query.where(GlossaryTerm.source_lang == source_lang)
            count_query = count_query.where(GlossaryTerm.source_lang == source_lang)
        if target_lang is not None:
            query = query.where(GlossaryTerm.target_lang == target_lang)
            count_query = count_query.where(GlossaryTerm.target_lang == target_lang)
        if domain is not None:
            query = query.where(GlossaryTerm.domain == domain)
            count_query = count_query.where(GlossaryTerm.domain == domain)

        result = await self.db.execute(query.limit(limit).offset(offset))
        items = list(result.scalars().all())

        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        return items, total

    async def create(self, term: GlossaryTerm) -> GlossaryTerm:
        self.db.add(term)
        await self.db.commit()
        await self.db.refresh(term)
        return term

    async def update(self, term: GlossaryTerm) -> GlossaryTerm:
        self.db.add(term)
        await self.db.commit()
        await self.db.refresh(term)
        return term

    async def delete(self, term: GlossaryTerm) -> None:
        await self.db.delete(term)
        await self.db.commit()

    async def get_by_domain(
        self, domain: str, source_lang: str, target_lang: str
    ) -> list[GlossaryTerm]:
        result = await self.db.execute(
            select(GlossaryTerm).where(
                GlossaryTerm.domain == domain,
                GlossaryTerm.source_lang == source_lang,
                GlossaryTerm.target_lang == target_lang,
                GlossaryTerm.is_active.is_(True),
            )
        )
        return list(result.scalars().all())

    async def bulk_create(
        self, terms: list[GlossaryTerm]
    ) -> tuple[int, int]:
        """Insert terms using ON CONFLICT DO NOTHING. Returns (created, skipped)."""
        if not terms:
            return 0, 0

        now = utc_now()
        rows = [
            {
                "id": t.id if t.id is not None else uuid.uuid4(),
                "term": t.term,
                "translation": t.translation,
                "source_lang": t.source_lang,
                "target_lang": t.target_lang,
                "domain": t.domain,
                "context_note": t.context_note,
                "is_active": t.is_active if t.is_active is not None else True,
                "created_at": t.created_at if t.created_at is not None else now,
                "updated_at": t.updated_at if t.updated_at is not None else now,
            }
            for t in terms
        ]

        stmt = (
            insert(GlossaryTerm)
            .values(rows)
            .on_conflict_do_nothing(
                index_elements=["term", "source_lang", "target_lang"]
            )
        )
        result = await self.db.execute(stmt)
        await self.db.commit()

        created = result.rowcount if result.rowcount is not None else 0
        skipped = len(terms) - created
        return created, skipped

    async def get_active_terms(
        self, source_lang: str, target_lang: str
    ) -> list[GlossaryTerm]:
        result = await self.db.execute(
            select(GlossaryTerm).where(
                GlossaryTerm.source_lang == source_lang,
                GlossaryTerm.target_lang == target_lang,
                GlossaryTerm.is_active.is_(True),
            )
        )
        return list(result.scalars().all())

    async def list_domains(self) -> list[str]:
        result = await self.db.execute(
            select(GlossaryTerm.domain)
            .where(GlossaryTerm.domain.isnot(None))
            .distinct()
            .order_by(GlossaryTerm.domain)
        )
        return [row for row in result.scalars().all() if row is not None]
