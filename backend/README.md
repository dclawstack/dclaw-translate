# DClaw Translate — Backend

FastAPI backend for DClaw Translate, an AI-powered translation platform. Provides REST APIs for translations, document processing, glossary management, translation memory, QA checks, and review workflows.

---

## Tech Stack

| Layer | Library |
|---|---|
| Web framework | FastAPI 0.110+ |
| ORM | SQLAlchemy 2.0 (async) |
| Database driver | asyncpg |
| Migrations | Alembic |
| Validation | Pydantic v2 + pydantic-settings |
| Server | Uvicorn |
| Document parsing | PyMuPDF (PDF), python-docx (DOCX), python-pptx (PPTX) |
| Testing | pytest + pytest-asyncio 0.24.0 |
| HTTP client | httpx |
| LLM providers | Ollama (local) + OpenRouter (cloud) |

---

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── main.py              # FastAPI app, router wiring, lifespan
│   │   ├── routes/
│   │   │   └── health.py        # GET /health/
│   │   └── v1/
│   │       ├── dashboard.py     # Stats, seed/clear demo data
│   │       ├── documents.py     # Document upload/translate/download
│   │       ├── glossary.py      # Glossary CRUD + bulk import
│   │       ├── memory.py        # Translation memory + fuzzy search
│   │       ├── providers.py     # LLM provider CRUD + test connection
│   │       ├── qa.py            # QA checks + review workflow
│   │       ├── translate.py     # Legacy translate endpoint (kept for compat)
│   │       └── translations.py  # AI translation workspace
│   ├── core/
│   │   ├── config.py            # Settings (reads .env)
│   │   └── database.py          # Async engine, session factory, init_db
│   ├── models/
│   │   ├── base.py              # DeclarativeBase, utc_now()
│   │   ├── document.py
│   │   ├── glossary.py
│   │   ├── llm_provider.py
│   │   ├── qa_check.py
│   │   ├── review.py
│   │   ├── translation.py       # Translation + TranslationSegment
│   │   └── translation_memory.py
│   ├── repositories/            # DB access layer (one file per model)
│   ├── schemas/                 # Pydantic request/response schemas
│   └── services/
│       ├── document_service.py  # File extraction + translation pipeline
│       ├── glossary_service.py  # Glossary enforcement helpers
│       ├── llm_service.py       # Ollama + OpenRouter dispatch + fallback
│       ├── qa_engine.py         # Rule-based QA checks
│       ├── review_service.py    # Review workflow
│       ├── seed.py              # Idempotent demo data seeding
│       ├── tm_service.py        # Translation memory helpers
│       └── translation_service.py
├── alembic/
│   ├── env.py                   # Alembic env — imports all models
│   └── versions/                # Migration files
├── tests/
│   ├── conftest.py              # Async test client, in-memory DB fixtures
│   ├── test_dashboard.py
│   ├── test_documents.py
│   ├── test_glossary.py
│   ├── test_providers.py
│   ├── test_qa.py
│   ├── test_translations.py
│   └── test_translation_memory.py
├── uploads/                     # Uploaded documents (gitignored)
├── .env                         # Local env vars (gitignored)
├── alembic.ini
├── Dockerfile
└── requirements.txt
```

---

## Prerequisites

- Python 3.11+
- PostgreSQL 16 running locally (or via Docker)
- (Optional) Ollama for local LLM inference
- (Optional) OpenRouter API key for cloud LLM fallback

---

## First-Time Setup

### 1. Create and activate a virtual environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Create the database

If you have a local Postgres instance:

```bash
psql -U postgres -c "CREATE DATABASE dclaw_translate;"
```

If Postgres is running in Docker:

```bash
docker exec <container_name> psql -U postgres -c "CREATE DATABASE dclaw_translate;"
```

### 4. Create the `.env` file

```bash
cp .env.example .env   # if it exists, otherwise create manually
```

Minimum required content:

```env
DATABASE_URL=postgresql+asyncpg://postgres:<your_password>@localhost:5432/dclaw_translate
```

Optional LLM settings:

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct
```

### 5. Run migrations

```bash
alembic upgrade head
```

---

## Running the Server

**Must be run from the `backend/` directory** so Python can resolve the `app` module.

```bash
cd backend
source .venv/bin/activate
uvicorn app.api.main:app --port 8104 --reload
```

API is available at: `http://localhost:8104`  
Interactive docs: `http://localhost:8104/docs`  
Health check: `http://localhost:8104/health/`

---

## Environment Variables

All variables are read from `.env` in the `backend/` directory.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/dclaw_translate` | Full async DB connection string |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server base URL |
| `OLLAMA_MODEL` | `llama3.1` | Ollama model name |
| `OPENROUTER_API_KEY` | _(empty)_ | OpenRouter API key |
| `OPENROUTER_MODEL` | `meta-llama/llama-3.1-8b-instruct` | OpenRouter model |
| `UPLOAD_DIR` | `uploads` | Directory for uploaded documents (relative to `backend/`) |

---

## API Endpoints

### Health
| Method | Path | Description |
|---|---|---|
| GET | `/health/` | Liveness check |

### Dashboard
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/dashboard/stats` | Aggregated stats (counts, recent items, QA summary) |
| POST | `/api/v1/dashboard/seed` | Seed demo data |
| POST | `/api/v1/dashboard/seed/clear` | Clear demo data (fixed UUIDs only, never touches user data) |

### LLM Providers
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/providers/` | List all providers |
| POST | `/api/v1/providers/` | Create provider |
| GET | `/api/v1/providers/{id}` | Get provider |
| PUT | `/api/v1/providers/{id}` | Update provider |
| DELETE | `/api/v1/providers/{id}` | Delete provider |
| POST | `/api/v1/providers/{id}/default` | Set as default provider |
| POST | `/api/v1/providers/{id}/test` | Test connection (returns latency_ms) |

### Translations
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/translations/` | List (filter: source_lang, target_lang, status) |
| POST | `/api/v1/translations/` | Create & run translation (segment-by-segment via LLM) |
| GET | `/api/v1/translations/{id}` | Get with segments |
| PUT | `/api/v1/translations/{id}` | Update segment confirmations |
| DELETE | `/api/v1/translations/{id}` | Delete (cascades to segments) |
| POST | `/api/v1/translations/{id}/retry` | Re-translate |
| POST | `/api/v1/translations/segments/{seg_id}/alternative` | Get alternative phrasing |

### Documents
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/documents/upload` | Upload file (multipart: file, source_lang, target_lang) |
| GET | `/api/v1/documents/` | List documents |
| GET | `/api/v1/documents/{id}` | Get document |
| POST | `/api/v1/documents/{id}/translate` | Trigger translation pipeline |
| GET | `/api/v1/documents/{id}/download` | Download translated file |
| DELETE | `/api/v1/documents/{id}` | Delete document + files |

### Glossary
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/glossary/` | List terms (filter: source_lang, target_lang, domain) |
| POST | `/api/v1/glossary/` | Create term |
| GET | `/api/v1/glossary/domains` | List distinct domains |
| POST | `/api/v1/glossary/bulk` | Bulk create (skips duplicates) |
| GET | `/api/v1/glossary/{id}` | Get term |
| PUT | `/api/v1/glossary/{id}` | Update term |
| DELETE | `/api/v1/glossary/{id}` | Delete term |

### Translation Memory
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/memory/search` | Fuzzy search (pg_trgm similarity) |
| GET | `/api/v1/memory/` | List TM entries |
| GET | `/api/v1/memory/stats` | Total entries, usage, top domains |
| DELETE | `/api/v1/memory/{id}` | Delete entry |

### QA & Reviews
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/qa/run/{translation_id}` | Run QA checks on a translation |
| GET | `/api/v1/qa/report/{translation_id}` | Get existing QA report |
| PUT | `/api/v1/qa/checks/{check_id}/resolve` | Mark check as resolved |
| POST | `/api/v1/qa/reviews` | Assign review |
| GET | `/api/v1/qa/reviews` | List reviews (filter: status) |
| GET | `/api/v1/qa/reviews/queue` | Pending + in_review queue |
| GET | `/api/v1/qa/reviews/{id}` | Get review |
| PUT | `/api/v1/qa/reviews/{id}` | Update review (status, score, comments) |

---

## Running Tests

### Setup test database

```bash
# Create test database (run once)
psql -U postgres -c "CREATE DATABASE dclaw_app_test;"

# Apply migrations to test DB
DATABASE_URL="postgresql+asyncpg://postgres:<password>@localhost:5432/dclaw_app_test" alembic upgrade head
```

### Run all tests

```bash
source .venv/bin/activate
DATABASE_URL="postgresql+asyncpg://postgres:<password>@localhost:5432/dclaw_app_test" \
  python -m pytest -v --tb=short
```

### Run a specific test file

```bash
DATABASE_URL="postgresql+asyncpg://postgres:<password>@localhost:5432/dclaw_app_test" \
  python -m pytest tests/test_translations.py -v
```

### Run a single test

```bash
DATABASE_URL="postgresql+asyncpg://postgres:<password>@localhost:5432/dclaw_app_test" \
  python -m pytest tests/test_providers.py::test_create_provider -v
```

---

## Database Migrations

### Generate a new migration (after changing models)

```bash
alembic revision --autogenerate -m "describe your change"
```

### Apply all pending migrations

```bash
alembic upgrade head
```

### Roll back one migration

```bash
alembic downgrade -1
```

### Check current migration state

```bash
alembic current
```

### View migration history

```bash
alembic history --verbose
```

> **Note:** If autogenerate produces an empty migration, ensure all model files are imported in `alembic/env.py`.

---

## Troubleshooting

### `ModuleNotFoundError: No module named 'app'`

You ran `uvicorn` from the wrong directory. The `app` package lives inside `backend/`, so uvicorn must be launched from there:

```bash
cd backend   # ← this is required
uvicorn app.api.main:app --port 8104 --reload
```

### `asyncpg.InvalidPasswordError: password authentication failed`

Your `.env` has the wrong password. Check which password your Postgres container uses:

```bash
docker ps   # find the container name
docker exec <container> psql -U postgres -c "\l"   # list databases to confirm connection works
```

Then update `DATABASE_URL` in `.env` accordingly.

### `address already in use` on port 8104

```bash
lsof -i :8104          # find the process
kill -9 <PID>          # kill it
```

### `alembic upgrade head` produces no changes / empty migration

`alembic/env.py` must import all models so their metadata is registered:

```python
import app.models  # noqa: F401
```

Check that this line exists in `env.py`.

### `relation "translations" does not exist` during migration

Migrations must be applied in the correct order. Run:

```bash
alembic upgrade head
```

If a migration fails mid-way, check `alembic current` and manually resolve the conflict.

### `pg_trgm` extension not found (fuzzy search fails)

The translation memory migration enables it automatically. If you applied migrations before this was added, run manually:

```bash
psql -U postgres -d dclaw_translate -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
psql -U postgres -d dclaw_app_test -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

### Tests fail with `connection refused` or `could not connect`

The test database doesn't exist or Postgres isn't running. Verify:

```bash
pg_isready -h localhost -p 5432
```

### `pytest-asyncio` warnings or `ScopeMismatch` errors

`pytest-asyncio==0.24.0` is pinned. Do not upgrade it. If you see scope warnings, add to `conftest.py`:

```python
import pytest
pytest_plugins = ('pytest_asyncio',)
```

### LLM translation returns `status: failed`

1. Check you have a default LLM provider configured (via `/api/v1/providers/`).
2. For Ollama: ensure Ollama is running at `OLLAMA_URL` and the model is pulled: `ollama pull llama3.1`
3. For OpenRouter: verify `OPENROUTER_API_KEY` is set and valid.
4. Check backend logs — the error message is stored in `Translation.translated_text` when status is `failed`.

---

## Docker

Build and run the backend container:

```bash
docker build -t dclaw-translate-backend .
docker run -p 8104:8104 \
  -e DATABASE_URL="postgresql+asyncpg://postgres:password@host.docker.internal:5432/dclaw_translate" \
  dclaw-translate-backend
```
