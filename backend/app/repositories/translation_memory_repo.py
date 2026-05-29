from __future__ import annotations

import uuid

from sqlalchemy import func, select, text, update
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.utils import utc_now
from app.models.translation_memory import TranslationMemory


class TranslationMemoryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, entry_id: uuid.UUID) -> TranslationMemory | None:
        result = await self.db.execute(
            select(TranslationMemory).where(TranslationMemory.id == entry_id)
        )
        return result.scalar_one_or_none()

    async def list_all(
        self,
        source_lang: str | None = None,
        target_lang: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[TranslationMemory], int]:
        query = select(TranslationMemory)
        count_query = select(func.count()).select_from(TranslationMemory)

        if source_lang is not None:
            query = query.where(TranslationMemory.source_lang == source_lang)
            count_query = count_query.where(TranslationMemory.source_lang == source_lang)
        if target_lang is not None:
            query = query.where(TranslationMemory.target_lang == target_lang)
            count_query = count_query.where(TranslationMemory.target_lang == target_lang)

        result = await self.db.execute(query.limit(limit).offset(offset))
        items = list(result.scalars().all())

        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        return items, total

    async def create(self, entry: TranslationMemory) -> TranslationMemory:
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)
        return entry

    async def delete(self, entry: TranslationMemory) -> None:
        await self.db.delete(entry)
        await self.db.commit()

    async def fuzzy_search(
        self,
        source_text: str,
        source_lang: str,
        target_lang: str,
        threshold: float = 0.3,
        limit: int = 5,
    ) -> list[dict]:
        """Search using pg_trgm similarity. Returns list of dicts with all fields + 'similarity' key."""
        sql = text(
            """
            SELECT
                id,
                source_text,
                translated_text,
                source_lang,
                target_lang,
                domain,
                usage_count,
                last_used_at,
                translation_id,
                created_at,
                updated_at,
                similarity(source_text, :query) AS sim
            FROM translation_memory
            WHERE source_lang = :source_lang
              AND target_lang = :target_lang
              AND similarity(source_text, :query) > :threshold
            ORDER BY sim DESC
            LIMIT :limit
            """
        )
        try:
            result = await self.db.execute(
                sql,
                {
                    "query": source_text,
                    "source_lang": source_lang,
                    "target_lang": target_lang,
                    "threshold": threshold,
                    "limit": limit,
                },
            )
            rows = result.mappings().all()
            return [
                {
                    "id": row["id"],
                    "source_text": row["source_text"],
                    "translated_text": row["translated_text"],
                    "source_lang": row["source_lang"],
                    "target_lang": row["target_lang"],
                    "domain": row["domain"],
                    "usage_count": row["usage_count"],
                    "last_used_at": row["last_used_at"],
                    "translation_id": row["translation_id"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                    "similarity": float(row["sim"]),
                }
                for row in rows
            ]
        except OperationalError:
            # pg_trgm extension not enabled — return empty results
            return []

    async def record_usage(self, entry_id: uuid.UUID) -> None:
        await self.db.execute(
            update(TranslationMemory)
            .where(TranslationMemory.id == entry_id)
            .values(
                usage_count=TranslationMemory.usage_count + 1,
                last_used_at=utc_now(),
            )
        )
        await self.db.commit()

    async def get_stats(self) -> dict:
        total_result = await self.db.execute(
            select(func.count()).select_from(TranslationMemory)
        )
        total_entries = total_result.scalar() or 0

        usage_result = await self.db.execute(
            select(func.coalesce(func.sum(TranslationMemory.usage_count), 0))
        )
        total_usage = usage_result.scalar() or 0

        domain_result = await self.db.execute(
            select(TranslationMemory.domain, func.count().label("count"))
            .where(TranslationMemory.domain.isnot(None))
            .group_by(TranslationMemory.domain)
            .order_by(func.count().desc())
            .limit(10)
        )
        top_domains = [
            {"domain": row[0], "count": row[1]}
            for row in domain_result.all()
        ]

        return {
            "total_entries": total_entries,
            "total_usage": int(total_usage),
            "top_domains": top_domains,
        }
