from __future__ import annotations

import time
import uuid

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.llm_provider_repo import LLMProviderRepository

logger = structlog.get_logger(__name__)


class LLMService:
    def __init__(self, settings) -> None:
        self.settings = settings

    async def translate(
        self,
        db: AsyncSession,
        text: str,
        source_lang: str,
        target_lang: str,
        system_prompt: str,
        provider_id: uuid.UUID | None = None,
    ) -> dict:
        repo = LLMProviderRepository(db)
        provider = None
        if provider_id:
            provider = await repo.get_by_id(provider_id)
        if provider is None:
            provider = await repo.get_default()
        if provider is None:
            active = await repo.get_active()
            provider = active[0] if active else None
        if provider is None:
            raise RuntimeError("No active LLM provider available")

        _, user_prompt = self._build_translation_prompt(text, source_lang, target_lang)
        try:
            translated = await self._dispatch(provider, user_prompt, system_prompt)
        except Exception:
            logger.warning("Primary provider failed, trying fallbacks", provider=provider.name)
            translated = await self._try_fallbacks(db, provider.id, user_prompt, system_prompt)

        return {"translated_text": translated, "confidence": 0.9, "provider_id": provider.id}

    async def _dispatch(self, provider, prompt: str, system: str) -> str:
        if provider.provider_type == "ollama":
            return await self._call_ollama(provider.base_url, provider.model_name, prompt, system)
        return await self._call_openrouter(provider.api_key or "", provider.model_name, prompt, system)

    async def _try_fallbacks(self, db: AsyncSession, skip_id: uuid.UUID, prompt: str, system: str) -> str:
        repo = LLMProviderRepository(db)
        active = await repo.get_active()
        for p in active:
            if p.id == skip_id:
                continue
            try:
                return await self._dispatch(p, prompt, system)
            except Exception:
                logger.warning("Fallback provider failed", provider=p.name)
        raise RuntimeError("All providers failed")

    async def test_connection(self, db: AsyncSession, provider_id: uuid.UUID) -> dict:
        repo = LLMProviderRepository(db)
        provider = await repo.get_by_id(provider_id)
        if provider is None:
            return {"success": False, "message": "Provider not found", "latency_ms": 0.0}
        system = "You are a translator."
        prompt = "Translate 'Hello' to Spanish."
        start = time.monotonic()
        try:
            await self._dispatch(provider, prompt, system)
            latency = (time.monotonic() - start) * 1000
            return {"success": True, "message": "Connection successful", "latency_ms": round(latency, 2)}
        except Exception as e:
            latency = (time.monotonic() - start) * 1000
            return {"success": False, "message": str(e), "latency_ms": round(latency, 2)}

    async def _call_ollama(self, base_url: str, model: str, prompt: str, system: str) -> str:
        full_prompt = f"{system}\n\n{prompt}"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{base_url}/api/generate",
                json={"model": model, "prompt": full_prompt, "stream": False},
            )
            resp.raise_for_status()
            return resp.json()["response"]

    async def _call_openrouter(self, api_key: str, model: str, prompt: str, system: str) -> str:
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        body = {"model": model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}]}
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=body,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    def _build_translation_prompt(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        tone: str | None = None,
        domain: str | None = None,
        glossary_terms: list[dict] | None = None,
    ) -> tuple[str, str]:
        tone_part = f" Maintain {tone} tone." if tone else ""
        domain_part = f" Domain: {domain}." if domain else ""
        glossary_part = f" Enforce these glossary terms: {glossary_terms}." if glossary_terms else ""
        system = (
            f"You are a professional translator. Translate from {source_lang} to {target_lang}."
            f"{tone_part}{domain_part}{glossary_part}"
            " Return ONLY the translated text, nothing else."
        )
        return system, text
