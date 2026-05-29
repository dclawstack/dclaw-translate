from __future__ import annotations

import pytest

TERM_BASE = {
    "term": "contract",
    "translation": "contrato",
    "source_lang": "en",
    "target_lang": "es",
    "domain": "legal",
}


@pytest.mark.asyncio
async def test_create_glossary_term(client):
    resp = await client.post("/api/v1/glossary/", json=TERM_BASE)
    assert resp.status_code == 201
    data = resp.json()
    assert data["term"] == "contract"
    assert data["translation"] == "contrato"
    assert data["source_lang"] == "en"
    assert data["target_lang"] == "es"
    assert data["domain"] == "legal"
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.asyncio
async def test_list_terms(client):
    for i in range(3):
        resp = await client.post(
            "/api/v1/glossary/",
            json={
                "term": f"term{i}",
                "translation": f"termino{i}",
                "source_lang": "en",
                "target_lang": "es",
            },
        )
        assert resp.status_code == 201

    resp = await client.get("/api/v1/glossary/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert len(body["items"]) == 3


@pytest.mark.asyncio
async def test_list_by_domain(client):
    await client.post(
        "/api/v1/glossary/",
        json={**TERM_BASE, "term": "plaintiff", "translation": "demandante", "domain": "legal"},
    )
    await client.post(
        "/api/v1/glossary/",
        json={
            "term": "invoice",
            "translation": "factura",
            "source_lang": "en",
            "target_lang": "es",
            "domain": "finance",
        },
    )

    resp = await client.get("/api/v1/glossary/?domain=legal")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["domain"] == "legal"


@pytest.mark.asyncio
async def test_update_term(client):
    resp = await client.post("/api/v1/glossary/", json=TERM_BASE)
    assert resp.status_code == 201
    term_id = resp.json()["id"]

    resp = await client.put(f"/api/v1/glossary/{term_id}", json={"translation": "acuerdo"})
    assert resp.status_code == 200
    assert resp.json()["translation"] == "acuerdo"


@pytest.mark.asyncio
async def test_delete_term(client):
    resp = await client.post("/api/v1/glossary/", json=TERM_BASE)
    assert resp.status_code == 201
    term_id = resp.json()["id"]

    resp = await client.delete(f"/api/v1/glossary/{term_id}")
    assert resp.status_code == 200
    assert resp.json()["message"] == "deleted"

    resp = await client.get(f"/api/v1/glossary/{term_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_bulk_create(client):
    terms = [
        {
            "term": f"term{i}",
            "translation": f"termino{i}",
            "source_lang": "en",
            "target_lang": "es",
        }
        for i in range(5)
    ]
    resp = await client.post("/api/v1/glossary/bulk", json={"terms": terms})
    assert resp.status_code == 201
    data = resp.json()
    assert data["created"] == 5
    assert data["skipped"] == 0


@pytest.mark.asyncio
async def test_bulk_create_duplicate_skipped(client):
    term = {
        "term": "duplicate",
        "translation": "duplicado",
        "source_lang": "en",
        "target_lang": "es",
    }
    # First bulk insert
    resp = await client.post("/api/v1/glossary/bulk", json={"terms": [term]})
    assert resp.status_code == 201
    assert resp.json()["created"] == 1

    # Second insert of same term — should be skipped
    resp = await client.post("/api/v1/glossary/bulk", json={"terms": [term]})
    assert resp.status_code == 201
    data = resp.json()
    assert data["created"] == 0
    assert data["skipped"] == 1


@pytest.mark.asyncio
async def test_list_domains(client):
    await client.post(
        "/api/v1/glossary/",
        json={**TERM_BASE, "term": "plaintiff", "translation": "demandante", "domain": "legal"},
    )
    await client.post(
        "/api/v1/glossary/",
        json={
            "term": "invoice",
            "translation": "factura",
            "source_lang": "en",
            "target_lang": "es",
            "domain": "finance",
        },
    )

    resp = await client.get("/api/v1/glossary/domains")
    assert resp.status_code == 200
    domains = resp.json()
    assert "legal" in domains
    assert "finance" in domains


@pytest.mark.asyncio
async def test_get_nonexistent_returns_404(client):
    resp = await client.get("/api/v1/glossary/00000000-0000-0000-0000-000000000099")
    assert resp.status_code == 404
