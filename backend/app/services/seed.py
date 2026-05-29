from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.glossary import GlossaryTerm
from app.models.llm_provider import LLMProvider
from app.models.qa_check import QACheck
from app.models.review import Review
from app.models.translation import Translation
from app.models.translation_memory import TranslationMemory


def _utc(*args: int) -> datetime:
    return datetime(*args, tzinfo=timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# Fixed UUIDs — these are the only IDs cleared by clear_demo_data
# ---------------------------------------------------------------------------

SEED_PROVIDER_IDS = {
    "ollama": uuid.UUID("00000000-0001-0001-0001-000000000001"),
    "openrouter": uuid.UUID("00000000-0001-0001-0001-000000000002"),
}

SEED_TRANSLATION_IDS = [
    uuid.UUID(f"00000000-0002-0002-0002-{i:012d}") for i in range(1, 6)
]

SEED_DOCUMENT_IDS = [
    uuid.UUID(f"00000000-0003-0003-0003-{i:012d}") for i in range(1, 4)
]

SEED_GLOSSARY_IDS = [
    uuid.UUID(f"00000000-0004-0004-0004-{i:012d}") for i in range(1, 16)
]

SEED_TM_IDS = [
    uuid.UUID(f"00000000-0005-0005-0005-{i:012d}") for i in range(1, 11)
]

SEED_QA_IDS = [
    uuid.UUID(f"00000000-0006-0006-0006-{i:012d}") for i in range(1, 5)
]

SEED_REVIEW_IDS = [
    uuid.UUID(f"00000000-0007-0007-0007-{i:012d}") for i in range(1, 3)
]

# ---------------------------------------------------------------------------
# Seed data definitions
# ---------------------------------------------------------------------------

SEED_PROVIDERS = [
    {
        "id": SEED_PROVIDER_IDS["ollama"],
        "name": "ollama-local",
        "display_name": "Ollama (Local)",
        "provider_type": "ollama",
        "api_key": None,
        "base_url": "http://localhost:11434",
        "model_name": "llama3.1",
        "is_active": True,
        "is_default": True,
    },
    {
        "id": SEED_PROVIDER_IDS["openrouter"],
        "name": "openrouter-cloud",
        "display_name": "OpenRouter (Cloud)",
        "provider_type": "openrouter",
        "api_key": None,
        "base_url": "https://openrouter.ai",
        "model_name": "meta-llama/llama-3.1-8b-instruct",
        "is_active": True,
        "is_default": False,
    },
]

SEED_TRANSLATIONS = [
    {
        "id": SEED_TRANSLATION_IDS[0],
        "source_text": "The contract shall be governed by the laws of the State of California.",
        "translated_text": "Le contrat sera régi par les lois de l'État de Californie.",
        "source_lang": "en",
        "target_lang": "fr",
        "tone": "formal",
        "domain": "legal",
        "confidence_score": 0.94,
        "provider_id": SEED_PROVIDER_IDS["ollama"],
        "status": "completed",
        "word_count": 14,
    },
    {
        "id": SEED_TRANSLATION_IDS[1],
        "source_text": "El paciente debe tomar dos cápsulas por vía oral dos veces al día.",
        "translated_text": "The patient must take two capsules orally twice a day.",
        "source_lang": "es",
        "target_lang": "en",
        "tone": "formal",
        "domain": "medical",
        "confidence_score": 0.97,
        "provider_id": SEED_PROVIDER_IDS["openrouter"],
        "status": "completed",
        "word_count": 14,
    },
    {
        "id": SEED_TRANSLATION_IDS[2],
        "source_text": "Die API gibt einen HTTP 200-Statuscode zurück, wenn die Anfrage erfolgreich ist.",
        "translated_text": "The API returns an HTTP 200 status code when the request is successful.",
        "source_lang": "de",
        "target_lang": "en",
        "tone": "neutral",
        "domain": "technical",
        "confidence_score": 0.91,
        "provider_id": SEED_PROVIDER_IDS["ollama"],
        "status": "completed",
        "word_count": 15,
    },
    {
        "id": SEED_TRANSLATION_IDS[3],
        "source_text": "Bonjour, comment puis-je vous aider aujourd'hui?",
        "translated_text": None,
        "source_lang": "fr",
        "target_lang": "en",
        "tone": "friendly",
        "domain": None,
        "confidence_score": None,
        "provider_id": None,
        "status": "pending",
        "word_count": 8,
    },
    {
        "id": SEED_TRANSLATION_IDS[4],
        "source_text": "This document contains confidential information.",
        "translated_text": None,
        "source_lang": "en",
        "target_lang": "ja",
        "tone": "formal",
        "domain": "legal",
        "confidence_score": None,
        "provider_id": SEED_PROVIDER_IDS["openrouter"],
        "status": "failed",
        "word_count": 6,
    },
]

SEED_DOCUMENTS = [
    {
        "id": SEED_DOCUMENT_IDS[0],
        "filename": "contract_nda_2024.pdf",
        "original_path": "/uploads/seed/contract_nda_2024.pdf",
        "translated_path": "/uploads/seed/contract_nda_2024_fr.pdf",
        "file_type": "pdf",
        "file_size": 204800,
        "source_lang": "en",
        "target_lang": "fr",
        "status": "translated",
        "page_count": 4,
        "word_count": 1850,
        "error_message": None,
        "translation_id": SEED_TRANSLATION_IDS[0],
    },
    {
        "id": SEED_DOCUMENT_IDS[1],
        "filename": "medical_report_q1.docx",
        "original_path": "/uploads/seed/medical_report_q1.docx",
        "translated_path": None,
        "file_type": "docx",
        "file_size": 98304,
        "source_lang": "es",
        "target_lang": "en",
        "status": "processing",
        "page_count": 8,
        "word_count": 3200,
        "error_message": None,
        "translation_id": None,
    },
    {
        "id": SEED_DOCUMENT_IDS[2],
        "filename": "api_documentation_v2.txt",
        "original_path": "/uploads/seed/api_documentation_v2.txt",
        "translated_path": None,
        "file_type": "txt",
        "file_size": 51200,
        "source_lang": "de",
        "target_lang": "en",
        "status": "uploaded",
        "page_count": None,
        "word_count": 2100,
        "error_message": None,
        "translation_id": None,
    },
]

# 15 glossary terms across 3 domains: legal (5), medical (5), technical (5)
SEED_GLOSSARY_TERMS = [
    # Legal — en->fr
    {"id": SEED_GLOSSARY_IDS[0], "term": "indemnification", "translation": "indemnisation", "source_lang": "en", "target_lang": "fr", "domain": "legal", "context_note": "Compensation for harm or loss", "is_active": True},
    {"id": SEED_GLOSSARY_IDS[1], "term": "jurisdiction", "translation": "juridiction", "source_lang": "en", "target_lang": "fr", "domain": "legal", "context_note": None, "is_active": True},
    {"id": SEED_GLOSSARY_IDS[2], "term": "arbitration", "translation": "arbitrage", "source_lang": "en", "target_lang": "fr", "domain": "legal", "context_note": "Alternative dispute resolution", "is_active": True},
    {"id": SEED_GLOSSARY_IDS[3], "term": "plaintiff", "translation": "demandeur", "source_lang": "en", "target_lang": "fr", "domain": "legal", "context_note": None, "is_active": True},
    {"id": SEED_GLOSSARY_IDS[4], "term": "defendant", "translation": "défendeur", "source_lang": "en", "target_lang": "fr", "domain": "legal", "context_note": None, "is_active": True},
    # Medical — es->en
    {"id": SEED_GLOSSARY_IDS[5], "term": "hipertensión", "translation": "hypertension", "source_lang": "es", "target_lang": "en", "domain": "medical", "context_note": "High blood pressure", "is_active": True},
    {"id": SEED_GLOSSARY_IDS[6], "term": "diagnóstico", "translation": "diagnosis", "source_lang": "es", "target_lang": "en", "domain": "medical", "context_note": None, "is_active": True},
    {"id": SEED_GLOSSARY_IDS[7], "term": "anamnesis", "translation": "medical history", "source_lang": "es", "target_lang": "en", "domain": "medical", "context_note": "Patient's case history", "is_active": True},
    {"id": SEED_GLOSSARY_IDS[8], "term": "dosis", "translation": "dosage", "source_lang": "es", "target_lang": "en", "domain": "medical", "context_note": None, "is_active": True},
    {"id": SEED_GLOSSARY_IDS[9], "term": "receta", "translation": "prescription", "source_lang": "es", "target_lang": "en", "domain": "medical", "context_note": None, "is_active": True},
    # Technical — de->en
    {"id": SEED_GLOSSARY_IDS[10], "term": "Endpunkt", "translation": "endpoint", "source_lang": "de", "target_lang": "en", "domain": "technical", "context_note": "API endpoint", "is_active": True},
    {"id": SEED_GLOSSARY_IDS[11], "term": "Authentifizierung", "translation": "authentication", "source_lang": "de", "target_lang": "en", "domain": "technical", "context_note": None, "is_active": True},
    {"id": SEED_GLOSSARY_IDS[12], "term": "Datenbankabfrage", "translation": "database query", "source_lang": "de", "target_lang": "en", "domain": "technical", "context_note": None, "is_active": True},
    {"id": SEED_GLOSSARY_IDS[13], "term": "Zwischenspeicher", "translation": "cache", "source_lang": "de", "target_lang": "en", "domain": "technical", "context_note": "Temporary data store", "is_active": True},
    {"id": SEED_GLOSSARY_IDS[14], "term": "Schnittstelle", "translation": "interface", "source_lang": "de", "target_lang": "en", "domain": "technical", "context_note": None, "is_active": True},
]

SEED_TM_ENTRIES = [
    {"id": SEED_TM_IDS[0], "source_text": "The contract shall be governed by the laws of the State of California.", "translated_text": "Le contrat sera régi par les lois de l'État de Californie.", "source_lang": "en", "target_lang": "fr", "domain": "legal", "usage_count": 3, "translation_id": SEED_TRANSLATION_IDS[0]},
    {"id": SEED_TM_IDS[1], "source_text": "This agreement is entered into as of the date first written above.", "translated_text": "Cet accord est conclu à la date indiquée ci-dessus.", "source_lang": "en", "target_lang": "fr", "domain": "legal", "usage_count": 5, "translation_id": None},
    {"id": SEED_TM_IDS[2], "source_text": "El paciente debe tomar dos cápsulas por vía oral.", "translated_text": "The patient must take two capsules orally.", "source_lang": "es", "target_lang": "en", "domain": "medical", "usage_count": 2, "translation_id": SEED_TRANSLATION_IDS[1]},
    {"id": SEED_TM_IDS[3], "source_text": "Consulte a su médico antes de tomar este medicamento.", "translated_text": "Consult your doctor before taking this medication.", "source_lang": "es", "target_lang": "en", "domain": "medical", "usage_count": 7, "translation_id": None},
    {"id": SEED_TM_IDS[4], "source_text": "Die API gibt einen HTTP 200-Statuscode zurück.", "translated_text": "The API returns an HTTP 200 status code.", "source_lang": "de", "target_lang": "en", "domain": "technical", "usage_count": 1, "translation_id": SEED_TRANSLATION_IDS[2]},
    {"id": SEED_TM_IDS[5], "source_text": "Alle Felder sind Pflichtfelder.", "translated_text": "All fields are required.", "source_lang": "de", "target_lang": "en", "domain": "technical", "usage_count": 4, "translation_id": None},
    {"id": SEED_TM_IDS[6], "source_text": "All rights reserved.", "translated_text": "Tous droits réservés.", "source_lang": "en", "target_lang": "fr", "domain": "legal", "usage_count": 12, "translation_id": None},
    {"id": SEED_TM_IDS[7], "source_text": "Please read the instructions carefully.", "translated_text": "Veuillez lire attentivement les instructions.", "source_lang": "en", "target_lang": "fr", "domain": None, "usage_count": 6, "translation_id": None},
    {"id": SEED_TM_IDS[8], "source_text": "Error: connection timeout.", "translated_text": "Erreur : délai de connexion dépassé.", "source_lang": "en", "target_lang": "fr", "domain": "technical", "usage_count": 2, "translation_id": None},
    {"id": SEED_TM_IDS[9], "source_text": "Unauthorized access is prohibited.", "translated_text": "Accès non autorisé interdit.", "source_lang": "en", "target_lang": "fr", "domain": "legal", "usage_count": 3, "translation_id": None},
]

SEED_QA_CHECKS = [
    {
        "id": SEED_QA_IDS[0],
        "translation_id": SEED_TRANSLATION_IDS[0],
        "check_type": "terminology",
        "severity": "warning",
        "message": "Term 'governed' may have a more precise legal equivalent",
        "source_segment": "shall be governed by",
        "translated_segment": "sera régi par",
        "suggestion": "Consider 'sera soumis aux'",
        "is_resolved": True,
        "resolved_at": _utc(2026, 5, 20, 10, 0, 0),
    },
    {
        "id": SEED_QA_IDS[1],
        "translation_id": SEED_TRANSLATION_IDS[0],
        "check_type": "length_ratio",
        "severity": "info",
        "message": "Translation is 15% longer than source",
        "source_segment": None,
        "translated_segment": None,
        "suggestion": None,
        "is_resolved": False,
        "resolved_at": None,
    },
    {
        "id": SEED_QA_IDS[2],
        "translation_id": SEED_TRANSLATION_IDS[1],
        "check_type": "number_mismatch",
        "severity": "error",
        "message": "Numeric value '2' appears in source but not in translation",
        "source_segment": "dos cápsulas",
        "translated_segment": "two capsules",
        "suggestion": "Verify numeric consistency",
        "is_resolved": True,
        "resolved_at": _utc(2026, 5, 21, 14, 30, 0),
    },
    {
        "id": SEED_QA_IDS[3],
        "translation_id": SEED_TRANSLATION_IDS[2],
        "check_type": "formatting",
        "severity": "warning",
        "message": "HTTP status code formatting inconsistency",
        "source_segment": "HTTP 200-Statuscode",
        "translated_segment": "HTTP 200 status code",
        "suggestion": None,
        "is_resolved": False,
        "resolved_at": None,
    },
]

SEED_REVIEWS = [
    {
        "id": SEED_REVIEW_IDS[0],
        "translation_id": SEED_TRANSLATION_IDS[0],
        "reviewer_name": "Marie Dupont",
        "status": "approved",
        "comments": "Translation is accurate and uses appropriate legal terminology.",
        "score": 5,
        "assigned_at": _utc(2026, 5, 19, 9, 0, 0),
        "completed_at": _utc(2026, 5, 20, 11, 0, 0),
    },
    {
        "id": SEED_REVIEW_IDS[1],
        "translation_id": SEED_TRANSLATION_IDS[1],
        "reviewer_name": "Dr. James Wilson",
        "status": "pending",
        "comments": None,
        "score": None,
        "assigned_at": _utc(2026, 5, 25, 8, 0, 0),
        "completed_at": None,
    },
]


# ---------------------------------------------------------------------------
# Seed / clear helpers
# ---------------------------------------------------------------------------

async def _upsert_by_id(db: AsyncSession, model, data: dict) -> bool:
    """Insert if not exists by primary key. Returns True if inserted."""
    existing = await db.execute(select(model).where(model.id == data["id"]))
    if existing.scalar_one_or_none() is None:
        db.add(model(**data))
        return True
    return False


async def seed_providers(db: AsyncSession) -> int:
    inserted = sum([await _upsert_by_id(db, LLMProvider, d) for d in SEED_PROVIDERS])
    await db.commit()
    return inserted


async def seed_all(db: AsyncSession) -> dict:
    counts: dict[str, int] = {}

    # Providers first (translations FK to providers)
    counts["providers"] = sum([await _upsert_by_id(db, LLMProvider, d) for d in SEED_PROVIDERS])
    await db.commit()

    # Translations (documents / QA / reviews / TM FK to translations)
    counts["translations"] = sum([await _upsert_by_id(db, Translation, d) for d in SEED_TRANSLATIONS])
    await db.commit()

    counts["documents"] = sum([await _upsert_by_id(db, Document, d) for d in SEED_DOCUMENTS])
    counts["glossary_terms"] = sum([await _upsert_by_id(db, GlossaryTerm, d) for d in SEED_GLOSSARY_TERMS])
    counts["translation_memory"] = sum([await _upsert_by_id(db, TranslationMemory, d) for d in SEED_TM_ENTRIES])
    await db.commit()

    counts["qa_checks"] = sum([await _upsert_by_id(db, QACheck, d) for d in SEED_QA_CHECKS])
    counts["reviews"] = sum([await _upsert_by_id(db, Review, d) for d in SEED_REVIEWS])
    await db.commit()

    return counts


async def clear_providers(db: AsyncSession) -> int:
    seed_ids = list(SEED_PROVIDER_IDS.values())
    result = await db.execute(delete(LLMProvider).where(LLMProvider.id.in_(seed_ids)))
    await db.commit()
    return result.rowcount


async def clear_all(db: AsyncSession) -> dict:
    counts: dict[str, int] = {}

    # Delete in reverse FK dependency order
    review_ids = SEED_REVIEW_IDS
    r = await db.execute(delete(Review).where(Review.id.in_(review_ids)))
    counts["reviews"] = r.rowcount

    qa_ids = SEED_QA_IDS
    r = await db.execute(delete(QACheck).where(QACheck.id.in_(qa_ids)))
    counts["qa_checks"] = r.rowcount

    tm_ids = SEED_TM_IDS
    r = await db.execute(delete(TranslationMemory).where(TranslationMemory.id.in_(tm_ids)))
    counts["translation_memory"] = r.rowcount

    doc_ids = SEED_DOCUMENT_IDS
    r = await db.execute(delete(Document).where(Document.id.in_(doc_ids)))
    counts["documents"] = r.rowcount

    trans_ids = SEED_TRANSLATION_IDS
    r = await db.execute(delete(Translation).where(Translation.id.in_(trans_ids)))
    counts["translations"] = r.rowcount

    provider_ids = list(SEED_PROVIDER_IDS.values())
    r = await db.execute(delete(LLMProvider).where(LLMProvider.id.in_(provider_ids)))
    counts["providers"] = r.rowcount

    glossary_ids = SEED_GLOSSARY_IDS
    r = await db.execute(delete(GlossaryTerm).where(GlossaryTerm.id.in_(glossary_ids)))
    counts["glossary_terms"] = r.rowcount

    await db.commit()
    return counts
