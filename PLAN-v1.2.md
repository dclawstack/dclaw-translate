# DClaw Translate — v1.2 Feature Roadmap

> Based on: Y Combinator vertical SaaS principles, trending GitHub repos (argos-translate, libretranslate), AI product research (DeepL, Smartcat, Phrase, Unbabel)

## Pre-Flight Checklist

- [ ] `frontend/package-lock.json` committed after any `npm install` / dependency change
- [ ] `frontend/next-env.d.ts` exists and is committed
- [ ] `docker-compose.yml` healthchecks correct
- [ ] `frontend/Dockerfile` declares `ARG NEXT_PUBLIC_API_URL` before `RUN npm run build`

## v1.0 Feature Inventory (Current)

- [ ] Translation project CRUD
- [ ] Text/document upload
- [ ] Basic translation engine
- [ ] Glossary management
- [ ] Real backend CRUD (no mocks)
- [ ] Docker + Helm deployment
- [ ] Alembic migrations
- [ ] Backend tests

---

## v1.2 Roadmap

### P0 — Must Have (Ship in v1.0, demo-ready)

#### 1. AI Translate Copilot (Localization Expert)
**Description:** AI assistant that translates with context awareness, suggests terminology, and maintains style. "Translate this marketing copy to Japanese maintaining our brand voice."
- **AI Angle:** Context-aware LLM translation. Style preservation. Terminology enforcement.
- **Backend:** `/api/v1/ai/translate-chat` endpoint. Translation memory.
- **Frontend:** Side-by-side editor with AI suggestions and terminology highlighting.
- **Files:** `backend/app/services/translate_ai.py`, `frontend/src/components/translate-copilot.tsx`

#### 2. Document Translation (Multi-Format)
**Description:** Translate PDF, DOCX, PPTX, HTML, XLIFF while preserving formatting.
- **Backend:** Format-aware extraction and reconstruction pipeline.
- **Frontend:** Upload → translated document preview → download.
- **Files:** `backend/app/services/doc_translation.py`

#### 3. Translation Memory & Glossary
**Description:** Store and reuse previous translations. Enforce terminology consistency.
- **Backend:** TM search with fuzzy matching. Glossary enforcement.
- **Frontend:** TM matches sidebar. Glossary editor.
- **Files:** `backend/app/services/translation_memory.py`

#### 4. Quality Assurance & Review
**Description:** Automated QA checks: consistency, terminology, numbers, formatting. Review workflow.
- **Backend:** QA rule engine. Review assignment.
- **Frontend:** QA report with issue list. Review queue.
- **Files:** `backend/app/services/qa_engine.py`

### P1 — Should Have (v1.1–1.2)

#### 5. Real-Time Collaboration
**Description:** Multiple translators work on same document with segment locking and comments.
- **Backend:** Segment-level sync. Lock management.
- **Frontend:** Collaborative editor with user cursors.

#### 6. Machine Translation Post-Editing (MTPE)
**Description:** AI-generated first draft. Human editor refines. Track edit distance and productivity.
- **Backend:** MT engine integration. Edit distance calculation.
- **Frontend:** MT suggestion with accept/edit workflow.

#### 7. Localization Project Management
**Description:** Manage translation projects with deadlines, budgets, and translator assignments.
- **Backend:** Project management with resource allocation.
- **Frontend:** Project dashboard with progress tracking.

#### 8. Website & App Localization
**Description:** Extract strings from code/repos. Manage keys and translations. Auto-sync.
- **Backend:** Code parser (i18n format support). Git integration.
- **Frontend:** String management UI. Missing translation alerts.

### P2 — Could Have (v1.3+)

#### 9. AI Voice Translation (Dubbing)
**Description:** Translate and dub videos with voice cloning and lip sync.

#### 10. Context-Aware Image Translation
**Description:** Translate text in images while maintaining visual context and design.

#### 11. Cultural Adaptation Advisor
**Description:** AI suggests cultural adaptations beyond literal translation.

#### 12. Continuous Localization Automation
**Description:** Auto-detect code changes and trigger translation workflows.

---

## Implementation Priority

1. **Week 1–2:** AI Translate Copilot (P0.1) + Document Translation (P0.2)
2. **Week 3–4:** Translation Memory (P0.3) + QA & Review (P0.4)
3. **Week 5–6:** Collaboration (P1.5) + MTPE (P1.6)
4. **Week 7–8:** Project Management (P1.7) + Website Localization (P1.8)
