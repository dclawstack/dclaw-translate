from __future__ import annotations

import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.repositories.base_repo import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db, Document)

    async def list_all(  # type: ignore[override]
        self,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Document], int]:
        query = select(Document)
        count_query = select(func.count()).select_from(Document)
        if status is not None:
            query = query.where(Document.status == status)
            count_query = count_query.where(Document.status == status)
        query = query.order_by(Document.created_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(query)
        items = list(result.scalars().all())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        return items, total

    async def update(self, doc: Document) -> Document:
        await self.db.commit()
        await self.db.refresh(doc)
        return doc
