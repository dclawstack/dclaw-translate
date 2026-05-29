from __future__ import annotations

import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.translation import Translation, TranslationSegment
from app.repositories.translation_repo import TranslationRepository, TranslationSegmentRepository
from app.schemas.translation import TranslateRequest
from app.services.llm_service import LLMService

logger = structlog.get_logger(__name__)

_llm_service = LLMService(settings)


def _split_into_segments(text: str, max_chars: int = 500) -> list[str]:
    """Split text into segments by sentence or paragraph, respecting max_chars."""
    # First try splitting by double newline (paragraphs)
    parts: list[str] = []
    for paragraph in text.split("\n\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if len(paragraph) <= max_chars:
            parts.append(paragraph)
        else:
            # Split by sentence
            sentences = paragraph.split(". ")
            current = ""
            for i, sentence in enumerate(sentences):
                chunk = sentence if i == len(sentences) - 1 else sentence + ". "
                if len(current) + len(chunk) <= max_chars:
                    current += chunk
                else:
                    if current:
                        parts.append(current.strip())
                    current = chunk
            if current.strip():
                parts.append(current.strip())
    return parts if parts else [text]


class TranslationService:
    async def create_translation(
        self, db: AsyncSession, request: TranslateRequest
    ) -> Translation:
        repo = TranslationRepository(db)
        seg_repo = TranslationSegmentRepository(db)

        # 1. Create record with status=pending
        translation = Translation(
            source_text=request.source_text,
            source_lang=request.source_lang,
            target_lang=request.target_lang,
            tone=request.tone,
            domain=request.domain,
            provider_id=request.provider_id,
            status="pending",
        )
        translation = await repo.create(translation)

        # 2. Set status=translating, compute word_count
        translation.status = "translating"
        translation.word_count = len(request.source_text.split())
        await db.commit()
        await db.refresh(translation)

        try:
            # 3. Split into segments
            raw_segments = _split_into_segments(request.source_text)

            # 4. Build system prompt once
            system_prompt, _ = _llm_service._build_translation_prompt(
                text="",
                source_lang=request.source_lang,
                target_lang=request.target_lang,
                tone=request.tone,
                domain=request.domain,
            )

            translated_parts: list[str] = []
            segment_records: list[TranslationSegment] = []

            for idx, segment_text in enumerate(raw_segments):
                result = await _llm_service.translate(
                    db=db,
                    text=segment_text,
                    source_lang=request.source_lang,
                    target_lang=request.target_lang,
                    system_prompt=system_prompt,
                    provider_id=request.provider_id,
                )
                translated_part = result["translated_text"]
                used_provider_id = result.get("provider_id")
                translated_parts.append(translated_part)

                seg = TranslationSegment(
                    translation_id=translation.id,
                    segment_index=idx,
                    source_segment=segment_text,
                    translated_segment=translated_part,
                    is_confirmed=False,
                )
                segment_records.append(seg)

            # 5. Persist segments
            for seg in segment_records:
                seg_repo.db.add(seg)
            await db.commit()

            # 6. Join translated text
            translation.translated_text = "\n\n".join(translated_parts)
            # 7. Mark completed
            translation.status = "completed"
            translation.confidence_score = 0.85
            if used_provider_id and translation.provider_id is None:
                translation.provider_id = used_provider_id
            await db.commit()
            await db.refresh(translation)

        except Exception as exc:
            logger.error("Translation failed", error=str(exc))
            translation.status = "failed"
            await db.commit()
            await db.refresh(translation)

        return translation

    async def retry_translation(
        self, db: AsyncSession, translation_id: uuid.UUID
    ) -> Translation | None:
        repo = TranslationRepository(db)
        seg_repo = TranslationSegmentRepository(db)

        translation = await repo.get_by_id(translation_id)
        if translation is None:
            return None

        # Delete existing segments
        existing_segs = await seg_repo.get_by_translation(translation_id)
        for seg in existing_segs:
            await db.delete(seg)
        await db.commit()

        # Reset fields
        translation.status = "pending"
        translation.translated_text = None
        translation.confidence_score = None
        await db.commit()
        await db.refresh(translation)

        request = TranslateRequest(
            source_text=translation.source_text,
            source_lang=translation.source_lang,
            target_lang=translation.target_lang,
            tone=translation.tone,
            domain=translation.domain,
            provider_id=translation.provider_id,
        )
        return await self.create_translation(db, request)

    async def get_alternative_segment(
        self,
        db: AsyncSession,
        segment_id: uuid.UUID,
        provider_id: uuid.UUID | None = None,
    ) -> TranslationSegment | None:
        seg_repo = TranslationSegmentRepository(db)
        segment = await seg_repo.get_by_id(segment_id)
        if segment is None:
            return None

        # Fetch parent translation for lang info
        repo = TranslationRepository(db)
        translation = await repo.get_by_id(segment.translation_id)
        if translation is None:
            return None

        system_prompt = (
            f"You are a professional translator. Provide an alternative phrasing "
            f"for the following translation from {translation.source_lang} to {translation.target_lang}. "
            f"Return ONLY the alternative translated text, nothing else."
        )

        result = await _llm_service.translate(
            db=db,
            text=segment.source_segment,
            source_lang=translation.source_lang,
            target_lang=translation.target_lang,
            system_prompt=system_prompt,
            provider_id=provider_id,
        )
        segment.translated_segment = result["translated_text"]
        await db.commit()
        await db.refresh(segment)
        return segment
