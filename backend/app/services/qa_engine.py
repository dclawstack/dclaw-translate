from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.utils import utc_now
from app.models.qa_check import QACheck
from app.repositories.qa_repo import QARepository
from app.repositories.translation_repo import TranslationRepository


class QAEngine:
    @staticmethod
    def run_checks(
        source_text: str,
        translated_text: str,
        source_lang: str,
        target_lang: str,
        domain: str | None = None,
        glossary_terms: list[dict[str, str]] | None = None,
    ) -> list[dict[str, Any]]:
        checks: list[dict[str, Any]] = []

        # 1. NUMBER CONSISTENCY
        source_numbers = set(re.findall(r"\d+(?:\.\d+)?", source_text))
        translated_numbers = set(re.findall(r"\d+(?:\.\d+)?", translated_text))
        for num in source_numbers:
            if num not in translated_numbers:
                checks.append(
                    {
                        "check_type": "numbers",
                        "severity": "error",
                        "message": f"Number '{num}' found in source but missing in translation.",
                        "source_segment": source_text,
                        "translated_segment": translated_text,
                        "suggestion": f"Ensure '{num}' appears in the translated text.",
                    }
                )

        # 2. LENGTH RATIO
        if source_text:
            ratio = len(translated_text) / len(source_text)
            if ratio < 0.3 or ratio > 4.0:
                checks.append(
                    {
                        "check_type": "length",
                        "severity": "warning",
                        "message": (
                            f"Translation length ratio is {ratio:.2f} "
                            "(expected between 0.3 and 4.0)."
                        ),
                        "source_segment": source_text,
                        "translated_segment": translated_text,
                        "suggestion": "Review for potential truncation or over-expansion.",
                    }
                )

        # 3. FORMATTING (bullet/numbered list consistency)
        source_bullets = sum(
            1 for line in source_text.splitlines() if re.match(r"^\s*[-*]\s", line)
        )
        translated_bullets = sum(
            1 for line in translated_text.splitlines() if re.match(r"^\s*[-*]\s", line)
        )
        if source_bullets > 0 and translated_bullets == 0:
            checks.append(
                {
                    "check_type": "formatting",
                    "severity": "warning",
                    "message": (
                        f"Source has {source_bullets} bullet point(s) "
                        "but translation has none."
                    ),
                    "source_segment": source_text,
                    "translated_segment": translated_text,
                    "suggestion": "Preserve bullet/list structure in translation.",
                }
            )

        # 4. TERMINOLOGY (glossary check)
        if glossary_terms:
            for entry in glossary_terms:
                term = entry.get("term", "")
                translation = entry.get("translation", "")
                if term and term in source_text and translation and translation not in translated_text:
                    checks.append(
                        {
                            "check_type": "terminology",
                            "severity": "warning",
                            "message": (
                                f"Glossary term '{term}' found in source but "
                                f"expected translation '{translation}' not in output."
                            ),
                            "source_segment": term,
                            "translated_segment": None,
                            "suggestion": f"Use '{translation}' for '{term}'.",
                        }
                    )

        return checks

    async def run_checks_for_translation(
        self,
        db: AsyncSession,
        translation_id: uuid.UUID,
        glossary_terms: list[dict[str, str]] | None = None,
    ) -> list[QACheck]:
        translation_repo = TranslationRepository(db)
        translation = await translation_repo.get_by_id(translation_id)
        if translation is None:
            return []

        raw_checks = self.run_checks(
            source_text=translation.source_text,
            translated_text=translation.translated_text or "",
            source_lang=translation.source_lang,
            target_lang=translation.target_lang,
            domain=translation.domain,
            glossary_terms=glossary_terms,
        )

        qa_repo = QARepository(db)
        await qa_repo.delete_by_translation(translation_id)

        qa_checks = [
            QACheck(
                translation_id=translation_id,
                check_type=c["check_type"],
                severity=c["severity"],
                message=c["message"],
                source_segment=c.get("source_segment"),
                translated_segment=c.get("translated_segment"),
                suggestion=c.get("suggestion"),
            )
            for c in raw_checks
        ]

        if qa_checks:
            return await qa_repo.bulk_create(qa_checks)
        return []
