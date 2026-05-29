from __future__ import annotations

import pytest

PROVIDER_BASE = {
    "name": "test-ollama",
    "display_name": "Test Ollama",
    "provider_type": "ollama",
    "base_url": "http://localhost:11434",
    "model_name": "llama3.1",
}

PROVIDER_BASE_2 = {
    "name": "test-openrouter",
    "display_name": "Test OpenRouter",
    "provider_type": "openrouter",
    "base_url": "https://openrouter.ai",
    "model_name": "meta-llama/llama-3.1-8b-instruct",
    "api_key": "sk-abcdefgh12345678",
}


@pytest.mark.asyncio
async def test_provider_crud(client):
    # Create
    resp = await client.post("/api/v1/providers/", json=PROVIDER_BASE)
    assert resp.status_code == 201
    data = resp.json()
    provider_id = data["id"]
    assert data["name"] == "test-ollama"
    assert data["is_active"] is True

    # List
    resp = await client.get("/api/v1/providers/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 1
    assert any(p["id"] == provider_id for p in body["items"])

    # Get by ID
    resp = await client.get(f"/api/v1/providers/{provider_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == provider_id

    # Update
    resp = await client.put(f"/api/v1/providers/{provider_id}", json={"model_name": "llama3.2"})
    assert resp.status_code == 200
    assert resp.json()["model_name"] == "llama3.2"

    # Delete
    resp = await client.delete(f"/api/v1/providers/{provider_id}")
    assert resp.status_code == 200
    assert resp.json()["message"] == "deleted"

    # Confirm gone
    resp = await client.get(f"/api/v1/providers/{provider_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_set_default(client):
    resp1 = await client.post("/api/v1/providers/", json=PROVIDER_BASE)
    assert resp1.status_code == 201
    id1 = resp1.json()["id"]

    p2 = {**PROVIDER_BASE_2}
    p2.pop("api_key", None)
    resp2 = await client.post("/api/v1/providers/", json=p2)
    assert resp2.status_code == 201
    id2 = resp2.json()["id"]

    # Set id1 as default
    resp = await client.post(f"/api/v1/providers/{id1}/set-default")
    assert resp.status_code == 200
    assert resp.json()["is_default"] is True

    # Set id2 as default — id1 must no longer be default
    resp = await client.post(f"/api/v1/providers/{id2}/set-default")
    assert resp.status_code == 200
    assert resp.json()["is_default"] is True

    resp = await client.get(f"/api/v1/providers/{id1}")
    assert resp.json()["is_default"] is False


@pytest.mark.asyncio
async def test_api_key_masking(client):
    resp = await client.post("/api/v1/providers/", json=PROVIDER_BASE_2)
    assert resp.status_code == 201
    data = resp.json()
    assert data["api_key"] is not None
    # Should end with last 4 chars of original key: "5678"
    assert data["api_key"].startswith("****")
    assert data["api_key"].endswith("5678")
    assert "abcdefgh" not in data["api_key"]


@pytest.mark.asyncio
async def test_api_key_none_not_masked(client):
    resp = await client.post("/api/v1/providers/", json=PROVIDER_BASE)
    assert resp.status_code == 201
    assert resp.json()["api_key"] is None


@pytest.mark.asyncio
async def test_test_connection(client, monkeypatch):
    resp = await client.post("/api/v1/providers/", json=PROVIDER_BASE)
    assert resp.status_code == 201
    provider_id = resp.json()["id"]

    from app.services.llm_service import LLMService

    async def mock_call_ollama(self, base_url, model, prompt, system):
        return "Hola"

    monkeypatch.setattr(LLMService, "_call_ollama", mock_call_ollama)

    resp = await client.post(f"/api/v1/providers/{provider_id}/test")
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert "latency_ms" in body


@pytest.mark.asyncio
async def test_duplicate_name(client):
    resp = await client.post("/api/v1/providers/", json=PROVIDER_BASE)
    assert resp.status_code == 201

    resp2 = await client.post("/api/v1/providers/", json=PROVIDER_BASE)
    assert resp2.status_code == 409


@pytest.mark.asyncio
async def test_get_nonexistent_provider(client):
    resp = await client.get("/api/v1/providers/00000000-0000-0000-0000-000000000099")
    assert resp.status_code == 404
