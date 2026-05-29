from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.translation_memory import TranslationMemory
from app.repositories.translation_memory_repo import TranslationMemoryRepository


class TMService:
    async def find_matches(
        self,
        db: AsyncSession,
        source_text: str,
        source_lang: str,
        target_lang: str,
        threshold: float = 0.3,
    ) -> list[dict]:
        repo = TranslationMemoryRepository(db)
        return await repo.fuzzy_search(source_text, source_lang, target_lang, threshold)

    async def store_translation(
        self,
        db: AsyncSession,
        source_text: str,
        translated_text: str,
        source_lang: str,
        target_lang: str,
        domain: str | None = None,
        translation_id: uuid.UUID | None = None,
    ) -> TranslationMemory:
        repo = TranslationMemoryRepository(db)
        entry = TranslationMemory(
            source_text=source_text,
            translated_text=translated_text,
            source_lang=source_lang,
            target_lang=target_lang,
            domain=domain,
            translation_id=translation_id,
        )
        return await repo.create(entry)
