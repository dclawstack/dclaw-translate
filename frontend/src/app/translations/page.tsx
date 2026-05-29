"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createTranslation,
  deleteTranslation,
  getTranslations,
  retryTranslation,
  type Translation,
  type TranslateRequest,
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

const TONES = [
  { value: "", label: "None" },
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "technical", label: "Technical" },
  { value: "literary", label: "Literary" },
];

const DOMAINS = [
  { value: "", label: "None" },
  { value: "legal", label: "Legal" },
  { value: "medical", label: "Medical" },
  { value: "tech", label: "Tech" },
  { value: "marketing", label: "Marketing" },
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  translating: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

// ── Toast ──────────────────────────────────────────────────────────────────

interface ToastMsg {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastId = 0;

function Toast({ toasts, onDismiss }: { toasts: ToastMsg[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded shadow-lg text-sm font-medium flex items-center gap-2 ${
            t.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-70 hover:opacity-100">
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function TranslationsPage() {
  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [tone, setTone] = useState("");
  const [domain, setDomain] = useState("");
  const [translating, setTranslating] = useState(false);
  const [activeTranslation, setActiveTranslation] = useState<Translation | null>(null);
  const [history, setHistory] = useState<Translation[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const abortRef = useRef<boolean>(false);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const result = await getTranslations({ limit: 20, offset: 0 });
      setHistory(result.items);
      setHistoryTotal(result.total);
    } catch {
      // silently ignore — history is non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleTranslate() {
    if (!sourceText.trim()) return;
    setTranslating(true);
    setActiveTranslation(null);
    abortRef.current = false;
    try {
      const req: TranslateRequest = {
        source_text: sourceText,
        source_lang: sourceLang,
        target_lang: targetLang,
      };
      if (tone) req.tone = tone;
      if (domain) req.domain = domain;
      const result = await createTranslation(req);
      if (!abortRef.current) {
        setActiveTranslation(result);
        showToast("Translation complete", "success");
        loadHistory();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Translation failed";
      showToast(msg, "error");
    } finally {
      setTranslating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTranslation(id);
      showToast("Deleted", "success");
      if (activeTranslation?.id === id) setActiveTranslation(null);
      loadHistory();
    } catch {
      showToast("Delete failed", "error");
    }
  }

  async function handleRetry(id: string) {
    try {
      const result = await retryTranslation(id);
      showToast("Retranslation complete", "success");
      if (activeTranslation?.id === id) setActiveTranslation(result);
      loadHistory();
    } catch {
      showToast("Retry failed", "error");
    }
  }

  function handleView(t: Translation) {
    setActiveTranslation(t);
    setSourceText(t.source_text);
    setSourceLang(t.source_lang);
    setTargetLang(t.target_lang);
    setTone(t.tone ?? "");
    setDomain(t.domain ?? "");
  }

  const langLabel = (code: string) => LANGUAGES.find((l) => l.value === code)?.label ?? code;

  const selectCls = "text-sm border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-cyan";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-brand-cyan">Translations</h1>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground text-sm">Workspace</span>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Translation workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Source panel */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">From</label>
              <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className={selectCls}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide ml-2">Tone</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)} className={selectCls}>
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide ml-2">Domain</label>
              <select value={domain} onChange={(e) => setDomain(e.target.value)} className={selectCls}>
                {DOMAINS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Enter text to translate..."
              className="w-full h-48 resize-none border border-border rounded p-3 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-cyan"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {sourceText.split(/\s+/).filter(Boolean).length} words
              </span>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">To</label>
                <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className={selectCls}>
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleTranslate}
                  disabled={translating || !sourceText.trim()}
                  className="px-4 py-2 rounded text-sm font-medium text-white bg-brand-cyan hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {translating ? "Translating..." : "Translate"}
                </button>
              </div>
            </div>
          </div>

          {/* Result panel */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Translation — {langLabel(targetLang)}
              </span>
              {activeTranslation && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[activeTranslation.status] ?? "bg-muted text-muted-foreground"}`}>
                  {activeTranslation.status}
                </span>
              )}
            </div>

            {translating && (
              <div className="flex-1 flex items-center justify-center h-48 text-muted-foreground text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
                  Translating...
                </div>
              </div>
            )}

            {!translating && !activeTranslation && (
              <div className="flex-1 flex items-center justify-center h-48 text-muted-foreground text-sm">
                Translation will appear here
              </div>
            )}

            {!translating && activeTranslation && (
              <>
                {activeTranslation.status === "failed" ? (
                  <div className="h-48 flex items-center justify-center text-red-500 dark:text-red-400 text-sm">
                    Translation failed. Try again or select a different provider.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {activeTranslation.segments.map((seg) => (
                      <div key={seg.id} className="text-sm p-2 rounded border border-border bg-muted/50">
                        <p className="text-foreground">{seg.translated_segment}</p>
                        {seg.is_confirmed && (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Confirmed</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {activeTranslation.confidence_score !== null && (
                  <p className="text-xs text-muted-foreground">
                    Confidence: {Math.round((activeTranslation.confidence_score ?? 0) * 100)}%
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* History table */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Recent Translations
              {historyTotal > 0 && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">({historyTotal} total)</span>
              )}
            </h2>
            <button onClick={loadHistory} className="text-xs text-brand-cyan hover:underline">
              Refresh
            </button>
          </div>

          {historyLoading && (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
          )}

          {!historyLoading && history.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No translations yet</div>
          )}

          {!historyLoading && history.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left px-4 py-2 font-medium">Source</th>
                    <th className="text-left px-4 py-2 font-medium">Lang pair</th>
                    <th className="text-left px-4 py-2 font-medium">Tone / Domain</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Words</th>
                    <th className="text-right px-4 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((t) => (
                    <tr key={t.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-2 max-w-xs truncate text-foreground">
                        {t.source_text.slice(0, 60)}{t.source_text.length > 60 ? "…" : ""}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {langLabel(t.source_lang)} &rarr; {langLabel(t.target_lang)}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        {[t.tone, t.domain].filter(Boolean).join(" / ") || "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[t.status] ?? "bg-muted text-muted-foreground"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{t.word_count ?? "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleView(t)} className="text-xs text-brand-cyan hover:underline">
                            View
                          </button>
                          {t.status === "failed" && (
                            <button onClick={() => handleRetry(t.id)} className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline">
                              Retry
                            </button>
                          )}
                          <button onClick={() => handleDelete(t.id)} className="text-xs text-red-500 dark:text-red-400 hover:underline">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
