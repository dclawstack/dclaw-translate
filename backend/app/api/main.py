from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api.routes import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])

from app.api.v1 import providers  # noqa: E402
app.include_router(providers.router, prefix="/api/v1/providers", tags=["providers"])

from app.api.v1 import translations  # noqa: E402
app.include_router(translations.router, prefix="/api/v1/translations", tags=["translations"])

from app.api.v1 import glossary  # noqa: E402
app.include_router(glossary.router, prefix="/api/v1/glossary", tags=["glossary"])

from app.api.v1 import memory  # noqa: E402
app.include_router(memory.router, prefix="/api/v1/memory", tags=["memory"])

from app.api.v1 import qa  # noqa: E402
app.include_router(qa.router, prefix="/api/v1/qa", tags=["qa"])

from app.api.v1 import documents  # noqa: E402
app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])

from app.api.v1 import dashboard  # noqa: E402
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
