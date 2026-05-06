"""Translate API routes."""

import random
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class TranslateRequest(BaseModel):
    source_text: str
    source_lang: str
    target_lang: str


class TranslationResponse(BaseModel):
    id: str
    source_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    confidence: float
    created_at: str


class GlossaryTermResponse(BaseModel):
    id: str
    term: str
    translation: str
    domain: str


@router.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslateRequest) -> TranslationResponse:
    return TranslationResponse(
        id=str(uuid.uuid4()),
        source_text=request.source_text,
        translated_text=f"[Mock translation of: {request.source_text}]",
        source_lang=request.source_lang,
        target_lang=request.target_lang,
        confidence=round(random.uniform(0.85, 0.99), 2),
        created_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/translate/glossary", response_model=list[GlossaryTermResponse])
async def get_glossary() -> list[GlossaryTermResponse]:
    return [
        GlossaryTermResponse(
            id=str(uuid.uuid4()),
            term="machine learning",
            translation="apprentissage automatique",
            domain="tech",
        ),
        GlossaryTermResponse(
            id=str(uuid.uuid4()),
            term="cloud computing",
            translation="informatique en nuage",
            domain="tech",
        ),
        GlossaryTermResponse(
            id=str(uuid.uuid4()),
            term="supply chain",
            translation="chaîne d'approvisionnement",
            domain="business",
        ),
        GlossaryTermResponse(
            id=str(uuid.uuid4()),
            term="brand equity",
            translation="fond de marque",
            domain="marketing",
        ),
        GlossaryTermResponse(
            id=str(uuid.uuid4()),
            term="due diligence",
            translation="audit de diligence",
            domain="legal",
        ),
    ]
