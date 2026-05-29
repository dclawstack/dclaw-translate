from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.document import Document
from app.repositories.document_repo import DocumentRepository
from app.schemas.document import DocumentList, DocumentResponse, DocumentUploadResponse
from app.services.document_service import DocumentService
from app.services.llm_service import LLMService

router = APIRouter()

_document_service = DocumentService(settings)
_llm_service = LLMService(settings)


@router.post("/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    source_lang: str = Form(...),
    target_lang: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        saved_path, file_type, file_size = await _document_service.save_upload(file)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    doc = Document(
        filename=file.filename or "upload",
        original_path=saved_path,
        file_type=file_type,
        file_size=file_size,
        source_lang=source_lang,
        target_lang=target_lang,
        status="uploaded",
    )
    repo = DocumentRepository(db)
    doc = await repo.create(doc)
    return doc


@router.get("/", response_model=DocumentList)
async def list_documents(
    status: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    repo = DocumentRepository(db)
    items, total = await repo.list_all(status=status, limit=limit, offset=offset)
    return DocumentList(items=items, total=total)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = DocumentRepository(db)
    doc = await repo.get_by_id(document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.post("/{document_id}/translate", response_model=DocumentResponse, status_code=202)
async def translate_document(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = DocumentRepository(db)
    doc = await repo.get_by_id(document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = await _document_service.translate_document(db, document_id, _llm_service)
    return doc


@router.get("/{document_id}/download")
async def download_document(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = DocumentRepository(db)
    doc = await repo.get_by_id(document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.translated_path:
        raise HTTPException(status_code=404, detail="Translation not available yet")
    import os
    if not os.path.exists(doc.translated_path):
        raise HTTPException(status_code=404, detail="Translated file not found on disk")
    return FileResponse(
        path=doc.translated_path,
        filename=f"{doc.filename}.translated.txt",
        media_type="text/plain",
    )


@router.delete("/{document_id}")
async def delete_document(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = DocumentRepository(db)
    doc = await repo.get_by_id(document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    await _document_service.delete_files(doc)
    await repo.delete(doc)
    return {"message": "Document deleted"}
