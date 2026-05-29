from __future__ import annotations

import io
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient

# Ensure Document model is registered with Base.metadata
import app.models  # noqa: F401


def _make_docx_bytes() -> bytes:
    """Create a minimal in-memory docx file."""
    from docx import Document as DocxDoc

    doc = DocxDoc()
    doc.add_paragraph("Hello world. This is a test document for translation.")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_upload_document(client: AsyncClient):
    docx_bytes = _make_docx_bytes()
    response = await client.post(
        "/api/v1/documents/upload",
        files={"file": ("test.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"source_lang": "en", "target_lang": "es"},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "uploaded"
    assert body["filename"] == "test.docx"
    assert body["file_type"] == "docx"
    assert body["source_lang"] == "en"
    assert body["target_lang"] == "es"
    assert body["file_size"] > 0


@pytest.mark.asyncio
async def test_list_documents(client: AsyncClient):
    docx_bytes = _make_docx_bytes()
    for _ in range(2):
        await client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"source_lang": "en", "target_lang": "fr"},
        )
    response = await client.get("/api/v1/documents/")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2


@pytest.mark.asyncio
async def test_get_document(client: AsyncClient):
    docx_bytes = _make_docx_bytes()
    upload = await client.post(
        "/api/v1/documents/upload",
        files={"file": ("test.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"source_lang": "en", "target_lang": "de"},
    )
    doc_id = upload.json()["id"]

    response = await client.get(f"/api/v1/documents/{doc_id}")
    assert response.status_code == 200
    assert response.json()["id"] == doc_id


@pytest.mark.asyncio
async def test_translate_document(client: AsyncClient):
    docx_bytes = _make_docx_bytes()
    upload = await client.post(
        "/api/v1/documents/upload",
        files={"file": ("test.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"source_lang": "en", "target_lang": "es"},
    )
    assert upload.status_code == 201
    doc_id = upload.json()["id"]

    mock_result = {"translated_text": "Hola mundo.", "confidence": 0.9, "provider_id": None}
    with patch(
        "app.api.v1.documents._llm_service.translate",
        new_callable=AsyncMock,
        return_value=mock_result,
    ):
        response = await client.post(f"/api/v1/documents/{doc_id}/translate")

    assert response.status_code == 202, response.text
    body = response.json()
    assert body["status"] == "completed"
    assert body["translated_path"] is not None


@pytest.mark.asyncio
async def test_download_document(client: AsyncClient):
    docx_bytes = _make_docx_bytes()
    upload = await client.post(
        "/api/v1/documents/upload",
        files={"file": ("test.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"source_lang": "en", "target_lang": "es"},
    )
    doc_id = upload.json()["id"]

    mock_result = {"translated_text": "Hola mundo.", "confidence": 0.9, "provider_id": None}
    with patch(
        "app.api.v1.documents._llm_service.translate",
        new_callable=AsyncMock,
        return_value=mock_result,
    ):
        await client.post(f"/api/v1/documents/{doc_id}/translate")

    response = await client.get(f"/api/v1/documents/{doc_id}/download")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_delete_document(client: AsyncClient):
    docx_bytes = _make_docx_bytes()
    upload = await client.post(
        "/api/v1/documents/upload",
        files={"file": ("test.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"source_lang": "en", "target_lang": "ja"},
    )
    doc_id = upload.json()["id"]

    delete_resp = await client.delete(f"/api/v1/documents/{doc_id}")
    assert delete_resp.status_code == 200

    get_resp = await client.get(f"/api/v1/documents/{doc_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_upload_invalid_type(client: AsyncClient):
    response = await client.post(
        "/api/v1/documents/upload",
        files={"file": ("photo.jpg", b"\xff\xd8\xff\xe0fake", "image/jpeg")},
        data={"source_lang": "en", "target_lang": "es"},
    )
    assert response.status_code in (400, 422)
