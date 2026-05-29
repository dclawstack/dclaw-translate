# PRODUCT-SPEC: DClaw Translate

## Overview

**App Name:** DClaw Translate
**Domain:** AI-Powered Translation & Localization
**Target User:** Translation teams, localization managers, content creators

## Core Entities

### Translation
- id: UUID (PK)
- source_text: Text (required)
- translated_text: Text (nullable)
- source_lang: String(10) (required)
- target_lang: String(10) (required)
- tone: String(50) (optional) — "formal", "casual", "technical", "literary"
- domain: String(100) (optional) — "legal", "medical", "tech", "marketing"
- confidence_score: Float (optional)
- provider_id: UUID (FK → LLMProvider, ondelete=SET NULL)
- status: enum ["pending", "translating", "completed", "failed"] (default: "pending")
- word_count: Integer (optional)
- created_at: datetime
- updated_at: datetime

### TranslationSegment
- id: UUID (PK)
- translation_id: UUID (FK → Translation, ondelete=CASCADE)
- segment_index: Integer (required)
- source_segment: Text (required)
- translated_segment: Text (nullable)
- is_confirmed: Boolean (default: false)
- created_at: datetime

### Document
- id: UUID (PK)
- filename: String(500) (required)
- original_path: String(1000) (required)
- translated_path: String(1000) (nullable)
- file_type: enum ["pdf", "docx", "pptx"] (required)
- file_size: Integer (required)
- source_lang: String(10)
- target_lang: String(10)
- status: enum ["uploaded", "extracting", "translating", "reconstructing", "completed", "failed"] (default: "uploaded")
- page_count: Integer (optional)
- word_count: Integer (optional)
- error_message: Text (nullable)
- translation_id: UUID (FK → Translation, ondelete=SET NULL)
- created_at: datetime
- updated_at: datetime

### GlossaryTerm
- id: UUID (PK)
- term: String(500) (required)
- translation: String(500) (required)
- source_lang: String(10) (required)
- target_lang: String(10) (required)
- domain: String(100) (optional)
- context_note: Text (optional)
- is_active: Boolean (default: true)
- created_at: datetime
- updated_at: datetime
- Unique constraint: (term, source_lang, target_lang)

### TranslationMemory
- id: UUID (PK)
- source_text: Text (required)
- translated_text: Text (required)
- source_lang: String(10) (required)
- target_lang: String(10) (required)
- domain: String(100) (optional)
- usage_count: Integer (default: 0)
- last_used_at: datetime (optional)
- translation_id: UUID (FK → Translation, ondelete=SET NULL)
- created_at: datetime
- updated_at: datetime

### QACheck
- id: UUID (PK)
- translation_id: UUID (FK → Translation, ondelete=CASCADE)
- check_type: enum ["terminology", "consistency", "numbers", "formatting", "length"]
- severity: enum ["error", "warning", "info"]
- message: Text (required)
- source_segment: Text (optional)
- translated_segment: Text (optional)
- suggestion: Text (optional)
- is_resolved: Boolean (default: false)
- resolved_at: datetime (optional)
- created_at: datetime

### Review
- id: UUID (PK)
- translation_id: UUID (FK → Translation, ondelete=CASCADE)
- reviewer_name: String(200) (required)
- status: enum ["pending", "in_review", "approved", "rejected", "needs_changes"] (default: "pending")
- comments: Text (optional)
- score: Integer (1-5, optional)
- assigned_at: datetime
- completed_at: datetime (optional)
- created_at: datetime
- updated_at: datetime

### LLMProvider
- id: UUID (PK)
- name: String(100) (unique, required)
- display_name: String(200) (required)
- provider_type: enum ["ollama", "openrouter"]
- api_key: Text (optional, masked in responses)
- base_url: String(500) (required)
- model_name: String(200) (required)
- is_active: Boolean (default: true)
- is_default: Boolean (default: false)
- created_at: datetime
- updated_at: datetime

## User Stories / Screens

### Screen 1: Dashboard
- Summary cards: total translations, documents, glossary terms, pending reviews
- Recent translations and documents feeds
- QA summary (errors, warnings, resolved)
- Quick action buttons (new translation, upload document, add glossary term, review queue)
- Seed/clear demo data buttons

### Screen 2: Translation Workspace
- Side-by-side editor: source text (left), translated text (right)
- Language pair selector, tone dropdown, domain dropdown
- Segment-by-segment editing with "Get Alternative" per segment
- Translation history list
- Status badges (pending, translating, completed, failed)

### Screen 3: Document Translation
- Drag-and-drop upload zone (PDF, DOCX, PPTX)
- Documents table with filename, type, status, language pair
- Status tracking progress indicator
- Download button for completed translations

### Screen 4: Glossary & Translation Memory
- Glossary terms table with search and domain filter
- Add/edit term dialog
- Bulk CSV import
- Translation memory search interface
- TM statistics

### Screen 5: QA & Reviews
- QA report with issues grouped by severity (error/warning/info)
- Resolve button per issue with suggestion display
- Review queue table
- Review form (status, comments, quality score 1-5)

### Screen 6: Settings — LLM Providers
- Provider cards with status badges (active/inactive/default)
- Add/edit provider dialog (name, type, URL, API key, model)
- Test connection button
- Set default provider action

## AI Features

- **Context-aware translation:** LLM translation with tone, style, and domain preservation
- **Terminology enforcement:** Glossary terms injected into LLM prompts
- **Translation memory matching:** pg_trgm fuzzy search for reusable translations
- **QA automation:** Rule-based checks for numbers, terminology, length, formatting, consistency

## API Endpoints (v1.0)

### Translations
GET    /api/v1/translations          → List translations
POST   /api/v1/translations          → Create translation (triggers LLM)
GET    /api/v1/translations/{id}     → Get translation with segments
PUT    /api/v1/translations/{id}     → Update translation/segments
DELETE /api/v1/translations/{id}     → Delete translation
POST   /api/v1/translations/{id}/retry → Re-translate
POST   /api/v1/translations/segments/{id}/alternative → Get alternative

### Documents
POST   /api/v1/documents/upload      → Upload document (multipart)
GET    /api/v1/documents              → List documents
GET    /api/v1/documents/{id}         → Get document detail
POST   /api/v1/documents/{id}/translate → Trigger translation
GET    /api/v1/documents/{id}/download → Download translated file
DELETE /api/v1/documents/{id}         → Delete document

### Glossary
GET    /api/v1/glossary               → List terms
POST   /api/v1/glossary               → Create term
GET    /api/v1/glossary/{id}          → Get term
PUT    /api/v1/glossary/{id}          → Update term
DELETE /api/v1/glossary/{id}          → Delete term
POST   /api/v1/glossary/bulk          → Bulk import
GET    /api/v1/glossary/domains       → List domains

### Translation Memory
POST   /api/v1/memory/search          → Fuzzy search TM
GET    /api/v1/memory                 → List TM entries
DELETE /api/v1/memory/{id}            → Delete TM entry
GET    /api/v1/memory/stats           → TM statistics

### QA & Reviews
POST   /api/v1/qa/run/{translation_id} → Run QA checks
GET    /api/v1/qa/report/{translation_id} → Get QA report
PUT    /api/v1/qa/checks/{id}/resolve → Resolve check
POST   /api/v1/reviews                → Assign review
GET    /api/v1/reviews                → List reviews
GET    /api/v1/reviews/{id}           → Get review
PUT    /api/v1/reviews/{id}           → Update review
GET    /api/v1/reviews/queue          → Pending queue

### Providers
GET    /api/v1/providers              → List providers
POST   /api/v1/providers              → Create provider
GET    /api/v1/providers/{id}         → Get provider
PUT    /api/v1/providers/{id}         → Update provider
DELETE /api/v1/providers/{id}         → Delete provider
POST   /api/v1/providers/{id}/set-default → Set as default
POST   /api/v1/providers/{id}/test    → Test connection

### Dashboard
GET    /api/v1/dashboard/stats        → Dashboard statistics
POST   /api/v1/dashboard/seed         → Seed demo data
POST   /api/v1/dashboard/seed/clear   → Clear demo data

## Non-Functional Requirements

- Backend tests: 70%+ coverage
- Frontend: Responsive, Tailwind CSS + pre-built shadcn/ui components
- Docker: All services start with `docker compose up -d`
- No mock data — everything persisted to PostgreSQL
- Primary color: #0891B2 (cyan-600), secondary: #10B981 (emerald-500)
