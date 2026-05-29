from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.glossary_repo import GlossaryRepository


class GlossaryService:
    async def get_enforcement_terms(
        self,
        db: AsyncSession,
        source_lang: str,
        target_lang: str,
        domain: str | None = None,
    ) -> list[dict]:
        """Return active glossary terms as dicts for use in translation prompts."""
        repo = GlossaryRepository(db)
        if domain is not None:
            terms = await repo.get_by_domain(domain, source_lang, target_lang)
        else:
            terms = await repo.get_active_terms(source_lang, target_lang)
        return [{"term": t.term, "translation": t.translation} for t in terms]
