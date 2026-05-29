"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteDocument,
  downloadDocument,
  getDocuments,
  translateDocument,
  uploadDocument,
  type Document,
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

const STATUS_STYLES: Record<string, string> = {
  uploaded: "bg-muted text-muted-foreground",
  extracting: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  translating: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  reconstructing: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
          onClick={() => onDismiss(t.id)}
          className={`cursor-pointer rounded-lg px-4 py-3 text-sm shadow-lg text-white ${
            t.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDocuments({ limit: 50 });
      setDocuments(data.items);
      setTotal(data.total);
    } catch {
      addToast("Failed to load documents", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function handleUpload(file: File) {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "pptx"].includes(ext ?? "")) {
      addToast("Only .pdf, .docx, and .pptx files are supported", "error");
      return;
    }
    setUploading(true);
    try {
      await uploadDocument(file, sourceLang, targetLang);
      addToast(`"${file.name}" uploaded successfully`, "success");
      await fetchDocuments();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  async function handleTranslate(doc: Document) {
    setActionLoading(doc.id);
    try {
      await translateDocument(doc.id);
      addToast(`"${doc.filename}" translation complete`, "success");
      await fetchDocuments();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Translation failed", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDownload(doc: Document) {
    setActionLoading(doc.id);
    try {
      await downloadDocument(doc.id);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Download failed", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.filename}"?`)) return;
    setActionLoading(doc.id);
    try {
      await deleteDocument(doc.id);
      addToast(`"${doc.filename}" deleted`, "success");
      await fetchDocuments();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Delete failed", "error");
    } finally {
      setActionLoading(null);
    }
  }

  const selectCls = "rounded-lg border border-border px-3 py-2 text-sm bg-background text-foreground focus:border-brand-cyan focus:outline-none";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Document Translation</h1>
        <p className="mb-8 text-muted-foreground">Upload PDF, DOCX, or PPTX files for translation</p>

        {/* Upload section */}
        <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Upload Document
          </h2>

          {/* Language selectors */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Source language</label>
              <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className={selectCls}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <span className="mt-5 text-muted-foreground">→</span>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Target language</label>
              <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className={selectCls}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
              dragOver
                ? "border-brand-cyan bg-brand-cyan/10"
                : "border-border bg-muted/30 hover:border-brand-cyan hover:bg-brand-cyan/5"
            }`}
          >
            <svg className="mb-3 h-10 w-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {uploading ? (
              <p className="text-sm text-brand-cyan">Uploading...</p>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Click or drag &amp; drop to upload</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, PPTX supported</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.pptx"
              className="hidden"
              onChange={handleFileInput}
              disabled={uploading}
            />
          </div>
        </div>

        {/* Document list */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Documents</h2>
            <span className="text-sm text-muted-foreground">{total} total</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
          ) : documents.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No documents yet. Upload one above to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-3">Filename</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Languages</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Pages</th>
                    <th className="px-4 py-3">Words</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documents.map((doc) => {
                    const busy = actionLoading === doc.id;
                    return (
                      <tr key={doc.id} className="hover:bg-muted/50 transition-colors">
                        <td className="max-w-[200px] truncate px-6 py-3 font-medium text-foreground">
                          {doc.filename}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold uppercase text-muted-foreground">
                            {doc.file_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatBytes(doc.file_size)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{doc.source_lang} → {doc.target_lang}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[doc.status] ?? "bg-muted text-muted-foreground"}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{doc.page_count ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{doc.word_count ?? "—"}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {doc.status === "uploaded" && (
                              <button
                                onClick={() => handleTranslate(doc)}
                                disabled={busy}
                                className="rounded-lg bg-brand-cyan px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                              >
                                {busy ? "..." : "Translate"}
                              </button>
                            )}
                            {doc.status === "completed" && (
                              <button
                                onClick={() => handleDownload(doc)}
                                disabled={busy}
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                {busy ? "..." : "Download"}
                              </button>
                            )}
                            {doc.status === "failed" && doc.error_message && (
                              <span title={doc.error_message} className="cursor-help text-xs text-red-500 dark:text-red-400 underline decoration-dotted">
                                Error
                              </span>
                            )}
                            <button
                              onClick={() => handleDelete(doc)}
                              disabled={busy}
                              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-red-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
