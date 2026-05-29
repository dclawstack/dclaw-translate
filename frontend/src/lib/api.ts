class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = path;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new ApiError(`API error ${response.status}: ${error}`, response.status);
  }
  return response.json();
}

export async function getHealth() {
  return fetchJson<{ status: string }>("/health/");
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface LLMProvider {
  id: string;
  name: string;
  display_name: string;
  provider_type: string;
  base_url: string;
  model_name: string;
  api_key: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface LLMProviderCreate {
  name: string;
  display_name: string;
  provider_type: string;
  base_url: string;
  model_name: string;
  api_key?: string;
}

export interface LLMProviderUpdate {
  display_name?: string;
  api_key?: string;
  base_url?: string;
  model_name?: string;
  is_active?: boolean;
}

// ── Provider API ─────────────────────────────────────────────────────────────

export async function getProviders() {
  return fetchJson<{ items: LLMProvider[]; total: number }>("/api/v1/providers/");
}

export async function createProvider(data: LLMProviderCreate) {
  return fetchJson<LLMProvider>("/api/v1/providers/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProvider(id: string, data: LLMProviderUpdate) {
  return fetchJson<LLMProvider>(`/api/v1/providers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProvider(id: string) {
  return fetchJson<{ message: string }>(`/api/v1/providers/${id}`, {
    method: "DELETE",
  });
}

export async function setDefaultProvider(id: string) {
  return fetchJson<LLMProvider>(`/api/v1/providers/${id}/set-default`, {
    method: "POST",
  });
}

export async function testProviderConnection(id: string) {
  return fetchJson<{ success: boolean; message: string; latency_ms: number }>(
    `/api/v1/providers/${id}/test`,
    { method: "POST" }
  );
}

// ── Translation Types ────────────────────────────────────────────────────────

export interface TranslationSegment {
  id: string;
  segment_index: number;
  source_segment: string;
  translated_segment: string | null;
  is_confirmed: boolean;
}

export interface Translation {
  id: string;
  source_text: string;
  translated_text: string | null;
  source_lang: string;
  target_lang: string;
  tone: string | null;
  domain: string | null;
  status: string;
  confidence_score: number | null;
  word_count: number | null;
  created_at: string;
  updated_at: string;
  segments: TranslationSegment[];
  provider_id: string | null;
}

export interface TranslateRequest {
  source_text: string;
  source_lang: string;
  target_lang: string;
  tone?: string;
  domain?: string;
  provider_id?: string;
}

export interface TranslationSegmentUpdate {
  segment_id: string;
  translated_segment: string;
  is_confirmed?: boolean;
}

// ── Translation API ──────────────────────────────────────────────────────────

export async function createTranslation(data: TranslateRequest) {
  return fetchJson<Translation>("/api/v1/translations/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTranslations(params?: {
  source_lang?: string;
  target_lang?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const query = params
    ? "?" + new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        )
      ).toString()
    : "";
  return fetchJson<{ items: Translation[]; total: number }>(
    `/api/v1/translations/${query}`
  );
}

export async function getTranslation(id: string) {
  return fetchJson<Translation>(`/api/v1/translations/${id}`);
}

export async function updateTranslationSegments(
  id: string,
  updates: TranslationSegmentUpdate[]
) {
  return fetchJson<Translation>(`/api/v1/translations/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteTranslation(id: string) {
  return fetchJson<{ message: string }>(`/api/v1/translations/${id}`, {
    method: "DELETE",
  });
}

export async function retryTranslation(id: string) {
  return fetchJson<Translation>(`/api/v1/translations/${id}/retry`, {
    method: "POST",
  });
}

export { ApiError };

// ── Document Types ────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  source_lang: string;
  target_lang: string;
  status: string;
  page_count: number | null;
  word_count: number | null;
  original_path: string;
  translated_path: string | null;
  error_message: string | null;
  translation_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Document API ──────────────────────────────────────────────────────────────

export async function uploadDocument(
  file: File,
  sourceLang: string,
  targetLang: string
): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  form.append("source_lang", sourceLang);
  form.append("target_lang", targetLang);
  const response = await fetch("/api/v1/documents/upload", {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new ApiError(`API error ${response.status}: ${error}`, response.status);
  }
  return response.json();
}

export async function getDocuments(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: Document[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.offset !== undefined) qs.set("offset", String(params.offset));
  const query = qs.toString() ? `?${qs}` : "";
  return fetchJson<{ items: Document[]; total: number }>(`/api/v1/documents/${query}`);
}

export async function getDocument(id: string): Promise<Document> {
  return fetchJson<Document>(`/api/v1/documents/${id}`);
}

export async function translateDocument(id: string): Promise<Document> {
  return fetchJson<Document>(`/api/v1/documents/${id}/translate`, { method: "POST" });
}

export async function downloadDocument(id: string): Promise<void> {
  const response = await fetch(`/api/v1/documents/${id}/download`);
  if (!response.ok) {
    const error = await response.text();
    throw new ApiError(`API error ${response.status}: ${error}`, response.status);
  }
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `document-${id}.txt`;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function deleteDocument(id: string): Promise<{ message: string }> {
  return fetchJson<{ message: string }>(`/api/v1/documents/${id}`, { method: "DELETE" });
}

// ── Glossary Types ────────────────────────────────────────────────────────────

export interface GlossaryTerm {
  id: string;
  term: string;
  translation: string;
  source_lang: string;
  target_lang: string;
  domain: string | null;
  context_note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GlossaryTermCreate {
  term: string;
  translation: string;
  source_lang: string;
  target_lang: string;
  domain?: string;
  context_note?: string;
}

export interface GlossaryTermUpdate {
  translation?: string;
  domain?: string;
  context_note?: string;
  is_active?: boolean;
}

// ── Translation Memory Types ──────────────────────────────────────────────────

export interface TMEntry {
  id: string;
  source_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  domain: string | null;
  usage_count: number;
  last_used_at: string | null;
  translation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TMMatch {
  id: string;
  source_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  domain: string | null;
  similarity: number;
  usage_count: number;
}

export interface TMStats {
  total_entries: number;
  total_usage: number;
  top_domains: { domain: string; count: number }[];
}

// ── Glossary API ──────────────────────────────────────────────────────────────

export async function getGlossaryTerms(params?: {
  source_lang?: string;
  target_lang?: string;
  domain?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params?.source_lang) query.set("source_lang", params.source_lang);
  if (params?.target_lang) query.set("target_lang", params.target_lang);
  if (params?.domain) query.set("domain", params.domain);
  if (params?.limit !== undefined) query.set("limit", String(params.limit));
  if (params?.offset !== undefined) query.set("offset", String(params.offset));
  const qs = query.toString();
  return fetchJson<{ items: GlossaryTerm[]; total: number }>(
    `/api/v1/glossary/${qs ? `?${qs}` : ""}`
  );
}

export async function createGlossaryTerm(data: GlossaryTermCreate) {
  return fetchJson<GlossaryTerm>("/api/v1/glossary/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateGlossaryTerm(id: string, data: GlossaryTermUpdate) {
  return fetchJson<GlossaryTerm>(`/api/v1/glossary/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteGlossaryTerm(id: string) {
  return fetchJson<{ message: string }>(`/api/v1/glossary/${id}`, {
    method: "DELETE",
  });
}

export async function bulkCreateGlossaryTerms(terms: GlossaryTermCreate[]) {
  return fetchJson<{ created: number; skipped: number }>("/api/v1/glossary/bulk", {
    method: "POST",
    body: JSON.stringify({ terms }),
  });
}

export async function getGlossaryDomains() {
  return fetchJson<string[]>("/api/v1/glossary/domains");
}

// ── Translation Memory API ────────────────────────────────────────────────────

export async function searchTranslationMemory(data: {
  source_text: string;
  source_lang: string;
  target_lang: string;
  threshold?: number;
  limit?: number;
}) {
  return fetchJson<TMMatch[]>("/api/v1/memory/search", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTMEntries(params?: {
  source_lang?: string;
  target_lang?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params?.source_lang) query.set("source_lang", params.source_lang);
  if (params?.target_lang) query.set("target_lang", params.target_lang);
  if (params?.limit !== undefined) query.set("limit", String(params.limit));
  if (params?.offset !== undefined) query.set("offset", String(params.offset));
  const qs = query.toString();
  return fetchJson<{ items: TMEntry[]; total: number }>(
    `/api/v1/memory/${qs ? `?${qs}` : ""}`
  );
}

export async function deleteTMEntry(id: string) {
  return fetchJson<{ message: string }>(`/api/v1/memory/${id}`, {
    method: "DELETE",
  });
}

export async function getTMStats() {
  return fetchJson<TMStats>("/api/v1/memory/stats");
}

// ── QA & Review Types ─────────────────────────────────────────────────────────

export interface QACheck {
  id: string;
  translation_id: string;
  check_type: string;
  severity: string;
  message: string;
  source_segment: string | null;
  translated_segment: string | null;
  suggestion: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface QAReport {
  translation_id: string;
  checks: QACheck[];
  error_count: number;
  warning_count: number;
  info_count: number;
  unresolved_count: number;
}

export interface Review {
  id: string;
  translation_id: string;
  reviewer_name: string;
  status: string;
  comments: string | null;
  score: number | null;
  assigned_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewCreate {
  translation_id: string;
  reviewer_name: string;
  comments?: string;
}

export interface ReviewUpdate {
  status?: string;
  comments?: string;
  score?: number;
}

// ── QA API ────────────────────────────────────────────────────────────────────

export async function runQAChecks(translationId: string): Promise<QAReport> {
  return fetchJson<QAReport>(`/api/v1/qa/run/${translationId}`, { method: "POST" });
}

export async function getQAReport(translationId: string): Promise<QAReport> {
  return fetchJson<QAReport>(`/api/v1/qa/report/${translationId}`);
}

export async function resolveQACheck(checkId: string): Promise<QACheck> {
  return fetchJson<QACheck>(`/api/v1/qa/checks/${checkId}/resolve`, { method: "PUT" });
}

export async function createReview(data: ReviewCreate): Promise<Review> {
  return fetchJson<Review>("/api/v1/qa/reviews", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getReviews(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: Review[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.offset !== undefined) qs.set("offset", String(params.offset));
  const query = qs.toString() ? `?${qs}` : "";
  return fetchJson<{ items: Review[]; total: number }>(`/api/v1/qa/reviews${query}`);
}

export async function getReviewQueue(): Promise<Review[]> {
  return fetchJson<Review[]>("/api/v1/qa/reviews/queue");
}

export async function updateReview(id: string, data: ReviewUpdate): Promise<Review> {
  return fetchJson<Review>(`/api/v1/qa/reviews/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Dashboard Types ───────────────────────────────────────────────────────────

export interface DashboardStats {
  translations_count: number;
  documents_count: number;
  glossary_count: number;
  reviews_pending_count: number;
  tm_entries_count: number;
  recent_translations: {
    id: string;
    source_text: string;
    status: string;
    source_lang: string;
    target_lang: string;
    created_at: string;
  }[];
  recent_documents: {
    id: string;
    filename: string;
    file_type: string;
    status: string;
    created_at: string;
  }[];
  qa_summary: { errors: number; warnings: number; resolved: number };
  language_pairs: { source: string; target: string; count: number }[];
}

// ── Dashboard API ─────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  return fetchJson<DashboardStats>("/api/v1/dashboard/stats");
}

export async function seedDemoData(): Promise<{ message: string }> {
  return fetchJson<{ message: string }>("/api/v1/dashboard/seed", { method: "POST" });
}

export async function clearDemoData(): Promise<{ message: string }> {
  return fetchJson<{ message: string }>("/api/v1/dashboard/seed/clear", { method: "POST" });
}
