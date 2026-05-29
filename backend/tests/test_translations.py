from __future__ import annotations

import uuid

import pytest

TRANSLATION_BASE = {
    "source_text": "Hello world. This is a test.",
    "source_lang": "en",
    "target_lang": "es",
}


def _mock_translate(translated_text: str = "Hola mundo."):
    """Return a mock for LLMService.translate that returns a fixed string."""
    async def mock_translate(self, db, text, source_lang, target_lang, system_prompt, provider_id=None):
        return {"translated_text": translated_text, "confidence": 0.9, "provider_id": None}
    return mock_translate


@pytest.mark.asyncio
async def test_create_translation(client, monkeypatch):
    from app.services.llm_service import LLMService
    monkeypatch.setattr(LLMService, "translate", _mock_translate("Hola mundo."))

    resp = await client.post("/api/v1/translations/", json=TRANSLATION_BASE)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["source_lang"] == "en"
    assert data["target_lang"] == "es"
    assert data["status"] == "completed"
    assert data["translated_text"] is not None
    assert data["word_count"] == 6
    assert len(data["segments"]) >= 1
    assert data["confidence_score"] == 0.85


@pytest.mark.asyncio
async def test_create_translation_with_tone_domain(client, monkeypatch):
    from app.services.llm_service import LLMService
    monkeypatch.setattr(LLMService, "translate", _mock_translate("Bonjour le monde."))

    body = {**TRANSLATION_BASE, "target_lang": "fr", "tone": "formal", "domain": "legal"}
    resp = await client.post("/api/v1/translations/", json=body)
    assert resp.status_code == 201
    data = resp.json()
    assert data["tone"] == "formal"
    assert data["domain"] == "legal"
    assert data["status"] == "completed"


@pytest.mark.asyncio
async def test_list_translations(client, monkeypatch):
    from app.services.llm_service import LLMService
    monkeypatch.setattr(LLMService, "translate", _mock_translate("Hola mundo."))

    # Create two translations
    await client.post("/api/v1/translations/", json=TRANSLATION_BASE)
    await client.post("/api/v1/translations/", json={**TRANSLATION_BASE, "target_lang": "fr"})

    resp = await client.get("/api/v1/translations/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2


@pytest.mark.asyncio
async def test_list_with_filter_source_lang(client, monkeypatch):
    from app.services.llm_service import LLMService
    monkeypatch.setattr(LLMService, "translate", _mock_translate("Hola."))

    await client.post("/api/v1/translations/", json=TRANSLATION_BASE)
    await client.post("/api/v1/translations/", json={**TRANSLATION_BASE, "source_lang": "fr"})

    resp = await client.get("/api/v1/translations/?source_lang=en")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["source_lang"] == "en"


@pytest.mark.asyncio
async def test_list_with_filter_status(client, monkeypatch):
    from app.services.llm_service import LLMService
    monkeypatch.setattr(LLMService, "translate", _mock_translate("Hola."))

    await client.post("/api/v1/translations/", json=TRANSLATION_BASE)

    resp = await client.get("/api/v1/translations/?status=completed")
    assert resp.status_code == 200
    assert resp.json()["total"] == 1

    resp = await client.get("/api/v1/translations/?status=failed")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_get_translation_with_segments(client, monkeypatch):
    from app.services.llm_service import LLMService
    monkeypatch.setattr(LLMService, "translate", _mock_translate("Hola mundo."))

    create_resp = await client.post("/api/v1/translations/", json=TRANSLATION_BASE)
    translation_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/translations/{translation_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == translation_id
    assert len(data["segments"]) >= 1
    seg = data["segments"][0]
    assert "id" in seg
    assert "source_segment" in seg
    assert "translated_segment" in seg
    assert seg["is_confirmed"] is False


@pytest.mark.asyncio
async def test_get_nonexistent_translation(client):
    fake_id = str(uuid.uuid4())
    resp = await client.get(f"/api/v1/translations/{fake_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_segment(client, monkeypatch):
    from app.services.llm_service import LLMService
    monkeypatch.setattr(LLMService, "translate", _mock_translate("Hola mundo."))

    create_resp = await client.post("/api/v1/translations/", json=TRANSLATION_BASE)
    assert create_resp.status_code == 201
    translation_id = create_resp.json()["id"]
    segments = create_resp.json()["segments"]
    segment_id = segments[0]["id"]

    update_body = [
        {
            "segment_id": segment_id,
            "translated_segment": "Hola mundo editado.",
            "is_confirmed": True,
        }
    ]
    resp = await client.put(f"/api/v1/translations/{translation_id}", json=update_body)
    assert resp.status_code == 200
    data = resp.json()
    updated_seg = next(s for s in data["segments"] if s["id"] == segment_id)
    assert updated_seg["translated_segment"] == "Hola mundo editado."
    assert updated_seg["is_confirmed"] is True


@pytest.mark.asyncio
async def test_delete_translation_cascades_segments(client, monkeypatch):
    from app.services.llm_service import LLMService
    monkeypatch.setattr(LLMService, "translate", _mock_translate("Hola mundo."))

    create_resp = await client.post("/api/v1/translations/", json=TRANSLATION_BASE)
    translation_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/api/v1/translations/{translation_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["message"] == "deleted"

    # Confirm gone
    get_resp = await client.get(f"/api/v1/translations/{translation_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent_translation(client):
    fake_id = str(uuid.uuid4())
    resp = await client.delete(f"/api/v1/translations/{fake_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_retry_translation(client, monkeypatch):
    from app.services.llm_service import LLMService

    call_count = 0

    async def mock_translate_counting(self, db, text, source_lang, target_lang, system_prompt, provider_id=None):
        nonlocal call_count
        call_count += 1
        return {"translated_text": "Hola.", "confidence": 0.9, "provider_id": None}

    monkeypatch.setattr(LLMService, "translate", mock_translate_counting)

    create_resp = await client.post("/api/v1/translations/", json=TRANSLATION_BASE)
    translation_id = create_resp.json()["id"]
    initial_calls = call_count

    retry_resp = await client.post(f"/api/v1/translations/{translation_id}/retry")
    assert retry_resp.status_code == 200
    data = retry_resp.json()
    assert data["status"] == "completed"
    assert call_count > initial_calls


@pytest.mark.asyncio
async def test_retry_nonexistent_translation(client):
    fake_id = str(uuid.uuid4())
    resp = await client.post(f"/api/v1/translations/{fake_id}/retry")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_translation_llm_failure_sets_failed_status(client, monkeypatch):
    from app.services.llm_service import LLMService

    async def mock_translate_fail(self, db, text, source_lang, target_lang, system_prompt, provider_id=None):
        raise RuntimeError("LLM provider unavailable")

    monkeypatch.setattr(LLMService, "translate", mock_translate_fail)

    resp = await client.post("/api/v1/translations/", json=TRANSLATION_BASE)
    # Endpoint still returns 201, but status should be "failed"
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "failed"
    assert data["translated_text"] is None
