from __future__ import annotations

import pytest

from app.models.translation_memory import TranslationMemory
from app.repositories.translation_memory_repo import TranslationMemoryRepository
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import test_engine


ENTRY_BASE = {
    "source_text": "The contract shall be governed by English law.",
    "translated_text": "El contrato se regirá por la ley inglesa.",
    "source_lang": "en",
    "target_lang": "es",
    "domain": "legal",
}


async def _create_entry_direct(data: dict) -> TranslationMemory:
    """Helper to create a TM entry directly via repo (no TM create endpoint)."""
    async with AsyncSession(test_engine, expire_on_commit=False) as session:
        repo = TranslationMemoryRepository(session)
        entry = TranslationMemory(**data)
        return await repo.create(entry)


@pytest.mark.asyncio
async def test_store_tm_entry(client):
    entry = await _create_entry_direct(ENTRY_BASE)
    assert entry.id is not None
    assert entry.source_text == ENTRY_BASE["source_text"]
    assert entry.usage_count == 0


@pytest.mark.asyncio
async def test_list_tm_entries(client):
    await _create_entry_direct(ENTRY_BASE)

    resp = await client.get("/api/v1/memory/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["source_text"] == ENTRY_BASE["source_text"]


@pytest.mark.asyncio
async def test_fuzzy_search(client):
    await _create_entry_direct(ENTRY_BASE)

    resp = await client.post(
        "/api/v1/memory/search",
        json={
            "source_text": "The contract is governed by English law.",
            "source_lang": "en",
            "target_lang": "es",
            "threshold": 0.1,
        },
    )
    assert resp.status_code == 200
    matches = resp.json()
    assert len(matches) >= 1
    assert matches[0]["similarity"] > 0.1
    assert "translated_text" in matches[0]


@pytest.mark.asyncio
async def test_fuzzy_search_threshold(client):
    await _create_entry_direct(ENTRY_BASE)

    # Completely unrelated text — should not match above 0.9 threshold
    resp = await client.post(
        "/api/v1/memory/search",
        json={
            "source_text": "xyz abc 123 unrelated nonsense qwerty",
            "source_lang": "en",
            "target_lang": "es",
            "threshold": 0.9,
        },
    )
    assert resp.status_code == 200
    matches = resp.json()
    assert len(matches) == 0


@pytest.mark.asyncio
async def test_record_usage(client):
    entry = await _create_entry_direct(ENTRY_BASE)
    entry_id = str(entry.id)

    # Record usage via direct repo call
    async with AsyncSession(test_engine, expire_on_commit=False) as session:
        repo = TranslationMemoryRepository(session)
        await repo.record_usage(entry.id)
        updated = await repo.get_by_id(entry.id)
        assert updated is not None
        assert updated.usage_count == 1
        assert updated.last_used_at is not None


@pytest.mark.asyncio
async def test_get_stats(client):
    await _create_entry_direct(ENTRY_BASE)
    await _create_entry_direct({
        **ENTRY_BASE,
        "source_text": "Jurisdiction clause applies.",
        "translated_text": "Se aplica la cláusula de jurisdicción.",
        "domain": "legal",
    })

    resp = await client.get("/api/v1/memory/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_entries"] == 2
    assert data["total_usage"] == 0
    assert isinstance(data["top_domains"], list)
    assert any(d["domain"] == "legal" for d in data["top_domains"])


@pytest.mark.asyncio
async def test_delete_entry(client):
    entry = await _create_entry_direct(ENTRY_BASE)
    entry_id = str(entry.id)

    resp = await client.delete(f"/api/v1/memory/{entry_id}")
    assert resp.status_code == 200
    assert resp.json()["message"] == "deleted"

    # Verify it's gone via list
    resp = await client.get("/api/v1/memory/")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0
