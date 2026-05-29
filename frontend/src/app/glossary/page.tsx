"use client";

import { useCallback, useEffect, useState } from "react";
import {
  bulkCreateGlossaryTerms,
  createGlossaryTerm,
  deleteGlossaryTerm,
  getGlossaryDomains,
  getGlossaryTerms,
  getTMEntries,
  getTMStats,
  searchTranslationMemory,
  updateGlossaryTerm,
  type GlossaryTerm,
  type GlossaryTermCreate,
  type TMEntry,
  type TMMatch,
  type TMStats,
} from "@/lib/api";

// ── Constants ──────────────────────────────────────────────────────────────

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
  { value: "ar", label: "Arabic" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
];

// ── Toast ──────────────────────────────────────────────────────────────────

interface ToastMsg {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastId = 0;

function Toast({ toasts, onDismiss }: { toasts: ToastMsg[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            t.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="ml-auto font-bold opacity-70 hover:opacity-100">×</button>
        </div>
      ))}
    </div>
  );
}

// ── Term Dialog ────────────────────────────────────────────────────────────

interface TermDialogProps {
  term: GlossaryTerm | null;
  onClose: () => void;
  onSave: (data: GlossaryTermCreate | { translation?: string; domain?: string; context_note?: string; is_active?: boolean }) => Promise<void>;
  saving: boolean;
}

function TermDialog({ term, onClose, onSave, saving }: TermDialogProps) {
  const isEdit = term !== null;
  const [form, setForm] = useState({
    term: term?.term ?? "",
    translation: term?.translation ?? "",
    source_lang: term?.source_lang ?? "en",
    target_lang: term?.target_lang ?? "es",
    domain: term?.domain ?? "",
    context_note: term?.context_note ?? "",
    is_active: term?.is_active ?? true,
  });

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEdit) {
      await onSave({
        translation: form.translation,
        domain: form.domain || undefined,
        context_note: form.context_note || undefined,
        is_active: form.is_active,
      });
    } else {
      await onSave({
        term: form.term,
        translation: form.translation,
        source_lang: form.source_lang,
        target_lang: form.target_lang,
        domain: form.domain || undefined,
        context_note: form.context_note || undefined,
      });
    }
  }

  const inputCls = "w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-brand-cyan focus:outline-none placeholder:text-muted-foreground";
  const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          {isEdit ? "Edit Term" : "Add Glossary Term"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {!isEdit && (
            <div>
              <label className={labelCls}>Term</label>
              <input required value={form.term} onChange={(e) => set("term", e.target.value)} className={inputCls} placeholder="contract" />
            </div>
          )}
          <div>
            <label className={labelCls}>Translation</label>
            <input required value={form.translation} onChange={(e) => set("translation", e.target.value)} className={inputCls} placeholder="contrato" />
          </div>
          {!isEdit && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelCls}>Source Language</label>
                <select value={form.source_lang} onChange={(e) => set("source_lang", e.target.value)} className={inputCls}>
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className={labelCls}>Target Language</label>
                <select value={form.target_lang} onChange={(e) => set("target_lang", e.target.value)} className={inputCls}>
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
          )}
          <div>
            <label className={labelCls}>Domain (optional)</label>
            <input value={form.domain} onChange={(e) => set("domain", e.target.value)} className={inputCls} placeholder="legal, medical, tech..." />
          </div>
          <div>
            <label className={labelCls}>Context Note (optional)</label>
            <textarea value={form.context_note} onChange={(e) => set("context_note", e.target.value)} rows={2} className={inputCls} placeholder="Usage context or notes..." />
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 accent-brand-cyan" />
              Active
            </label>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Term"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type Tab = "glossary" | "memory";

export default function GlossaryPage() {
  const [tab, setTab] = useState<Tab>("glossary");
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  function addToast(message: string, type: "success" | "error") {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  // ── Glossary state ──────────────────────────────────────────────────────

  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [totalTerms, setTotalTerms] = useState(0);
  const [domains, setDomains] = useState<string[]>([]);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDomain, setFilterDomain] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<GlossaryTerm | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);

  const loadTerms = useCallback(async () => {
    setLoadingTerms(true);
    try {
      const result = await getGlossaryTerms({ domain: filterDomain || undefined, limit: 100 });
      setTerms(result.items);
      setTotalTerms(result.total);
    } catch {
      addToast("Failed to load glossary terms", "error");
    } finally {
      setLoadingTerms(false);
    }
  }, [filterDomain]);

  const loadDomains = useCallback(async () => {
    try {
      const result = await getGlossaryDomains();
      setDomains(result);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    if (tab === "glossary") { loadTerms(); loadDomains(); }
  }, [tab, loadTerms, loadDomains]);

  const filteredTerms = searchQuery
    ? terms.filter((t) =>
        t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.translation.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : terms;

  async function handleSaveTerm(data: GlossaryTermCreate | { translation?: string; domain?: string; context_note?: string; is_active?: boolean }) {
    setSaving(true);
    try {
      if (editingTerm) {
        await updateGlossaryTerm(editingTerm.id, data as Parameters<typeof updateGlossaryTerm>[1]);
        addToast("Term updated", "success");
      } else {
        await createGlossaryTerm(data as GlossaryTermCreate);
        addToast("Term added", "success");
      }
      setDialogOpen(false);
      setEditingTerm(null);
      await loadTerms();
      await loadDomains();
    } catch {
      addToast("Failed to save term", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTerm(id: string) {
    if (!confirm("Delete this glossary term?")) return;
    try {
      await deleteGlossaryTerm(id);
      addToast("Term deleted", "success");
      await loadTerms();
      await loadDomains();
    } catch {
      addToast("Failed to delete term", "error");
    }
  }

  async function handleBulkImport() {
    if (!bulkText.trim()) return;
    const lines = bulkText.trim().split("\n").filter(Boolean);
    const termsList: GlossaryTermCreate[] = [];
    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length < 4) continue;
      termsList.push({ term: parts[0], translation: parts[1], source_lang: parts[2], target_lang: parts[3], domain: parts[4] || undefined });
    }
    if (termsList.length === 0) {
      addToast("No valid lines found. Format: term,translation,source_lang,target_lang[,domain]", "error");
      return;
    }
    setBulkImporting(true);
    try {
      const result = await bulkCreateGlossaryTerms(termsList);
      addToast(`Imported ${result.created} terms (${result.skipped} skipped as duplicates)`, "success");
      setBulkText("");
      await loadTerms();
      await loadDomains();
    } catch {
      addToast("Bulk import failed", "error");
    } finally {
      setBulkImporting(false);
    }
  }

  // ── Translation Memory state ────────────────────────────────────────────

  const [tmEntries, setTmEntries] = useState<TMEntry[]>([]);
  const [totalTm, setTotalTm] = useState(0);
  const [tmStats, setTmStats] = useState<TMStats | null>(null);
  const [loadingTm, setLoadingTm] = useState(false);
  const [tmSearch, setTmSearch] = useState("");
  const [tmSourceLang, setTmSourceLang] = useState("en");
  const [tmTargetLang, setTmTargetLang] = useState("es");
  const [tmMatches, setTmMatches] = useState<TMMatch[]>([]);
  const [searchingTm, setSearchingTm] = useState(false);

  const loadTm = useCallback(async () => {
    setLoadingTm(true);
    try {
      const [list, stats] = await Promise.all([getTMEntries({ limit: 100 }), getTMStats()]);
      setTmEntries(list.items);
      setTotalTm(list.total);
      setTmStats(stats);
    } catch {
      addToast("Failed to load translation memory", "error");
    } finally {
      setLoadingTm(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "memory") loadTm();
  }, [tab, loadTm]);

  async function handleTmSearch() {
    if (!tmSearch.trim()) return;
    setSearchingTm(true);
    setTmMatches([]);
    try {
      const matches = await searchTranslationMemory({ source_text: tmSearch, source_lang: tmSourceLang, target_lang: tmTargetLang, threshold: 0.1 });
      setTmMatches(matches);
      if (matches.length === 0) addToast("No matches found", "error");
    } catch {
      addToast("Search failed", "error");
    } finally {
      setSearchingTm(false);
    }
  }

  const inputCls = "rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-brand-cyan focus:outline-none placeholder:text-muted-foreground";

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Glossary & Translation Memory</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage terminology and reuse past translations</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1 w-fit">
          {(["glossary", "memory"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-card text-brand-cyan shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "glossary" ? "Glossary" : "Translation Memory"}
            </button>
          ))}
        </div>

        {/* ── Glossary Tab ──────────────────────────────────────────── */}
        {tab === "glossary" && (
          <div className="flex flex-col gap-6">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search terms..."
                className={`w-56 ${inputCls}`}
              />
              <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)} className={inputCls}>
                <option value="">All Domains</option>
                {domains.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <button
                onClick={() => { setEditingTerm(null); setDialogOpen(true); }}
                className="ml-auto rounded-lg bg-brand-cyan px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                + Add Term
              </button>
            </div>

            {/* Terms table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {loadingTerms ? (
                <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
              ) : filteredTerms.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  {searchQuery || filterDomain ? "No terms match your filter." : "No glossary terms yet. Add one to get started."}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Term</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Translation</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Languages</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Domain</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Active</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTerms.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{t.term}</td>
                        <td className="px-4 py-3 text-foreground">{t.translation}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {t.source_lang.toUpperCase()} → {t.target_lang.toUpperCase()}
                        </td>
                        <td className="px-4 py-3">
                          {t.domain ? (
                            <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">
                              {t.domain}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.is_active
                              ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {t.is_active ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setEditingTerm(t); setDialogOpen(true); }}
                              className="rounded px-2 py-1 text-xs font-medium text-brand-cyan hover:bg-brand-cyan/10 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTerm(t.id)}
                              className="rounded px-2 py-1 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{totalTerms} total terms</div>

            {/* Bulk import */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 font-medium text-foreground">Bulk Import</h3>
              <p className="mb-2 text-xs text-muted-foreground">
                One entry per line: <code className="rounded bg-muted px-1 text-foreground">term,translation,source_lang,target_lang[,domain]</code>
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={5}
                placeholder={"contract,contrato,en,es,legal\nplaintiff,demandante,en,es,legal"}
                className={`w-full font-mono text-xs ${inputCls}`}
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleBulkImport}
                  disabled={bulkImporting || !bulkText.trim()}
                  className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {bulkImporting ? "Importing..." : "Import"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Translation Memory Tab ────────────────────────────────── */}
        {tab === "memory" && (
          <div className="flex flex-col gap-6">
            {/* Stats */}
            {tmStats && (
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-2xl font-bold text-foreground">{tmStats.total_entries}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Entries</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-2xl font-bold text-foreground">{tmStats.total_usage}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Reuses</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-sm font-medium text-foreground mb-1">Top Domains</div>
                  {tmStats.top_domains.length === 0 ? (
                    <div className="text-xs text-muted-foreground">None</div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {tmStats.top_domains.slice(0, 5).map((d) => (
                        <span key={d.domain} className="rounded-full bg-brand-cyan/10 px-2 py-0.5 text-xs text-brand-cyan">
                          {d.domain} ({d.count})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fuzzy search */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 font-medium text-foreground">Fuzzy Search</h3>
              <div className="flex flex-wrap gap-3">
                <input
                  value={tmSearch}
                  onChange={(e) => setTmSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTmSearch()}
                  placeholder="Search for similar source text..."
                  className={`flex-1 min-w-48 ${inputCls}`}
                />
                <select value={tmSourceLang} onChange={(e) => setTmSourceLang(e.target.value)} className={inputCls}>
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
                <select value={tmTargetLang} onChange={(e) => setTmTargetLang(e.target.value)} className={inputCls}>
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
                <button
                  onClick={handleTmSearch}
                  disabled={searchingTm || !tmSearch.trim()}
                  className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {searchingTm ? "Searching..." : "Search"}
                </button>
              </div>

              {tmMatches.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {tmMatches.length} match{tmMatches.length !== 1 ? "es" : ""} found
                  </div>
                  {tmMatches.map((m) => (
                    <div key={m.id} className="rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-brand-cyan">
                          {Math.round(m.similarity * 100)}% match
                        </span>
                        {m.domain && (
                          <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">
                            {m.domain}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{m.source_text}</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{m.translated_text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TM entries table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {loadingTm ? (
                <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
              ) : tmEntries.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  No translation memory entries yet. Translations will be stored here automatically.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Source Text</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Translation</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Languages</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Domain</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Uses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tmEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/50 transition-colors">
                        <td className="max-w-xs px-4 py-3 text-foreground truncate">{e.source_text}</td>
                        <td className="max-w-xs px-4 py-3 text-foreground truncate">{e.translated_text}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {e.source_lang.toUpperCase()} → {e.target_lang.toUpperCase()}
                        </td>
                        <td className="px-4 py-3">
                          {e.domain ? (
                            <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">
                              {e.domain}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{e.usage_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{totalTm} total entries</div>
          </div>
        )}
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <TermDialog
          term={editingTerm}
          onClose={() => { setDialogOpen(false); setEditingTerm(null); }}
          onSave={handleSaveTerm}
          saving={saving}
        />
      )}

      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
