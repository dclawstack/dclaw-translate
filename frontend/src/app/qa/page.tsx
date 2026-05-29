"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createReview,
  getQAReport,
  getReviewQueue,
  getReviews,
  resolveQACheck,
  runQAChecks,
  updateReview,
  type QACheck,
  type QAReport,
  type Review,
  type ReviewCreate,
  type ReviewUpdate,
} from "@/lib/api";

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
          className={`flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium cursor-pointer ${
            t.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
          onClick={() => onDismiss(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Severity Badge ─────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === "error"
      ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700"
      : severity === "warning"
      ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700"
      : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase ${cls}`}>
      {severity}
    </span>
  );
}

// ── Check Type Badge ───────────────────────────────────────────────────────

function CheckTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded bg-muted border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase">
      {type}
    </span>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
      : status === "rejected"
      ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700"
      : status === "in_review"
      ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700"
      : status === "needs_changes"
      ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700"
      : "bg-muted text-muted-foreground border border-border";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ── Assign Review Dialog ───────────────────────────────────────────────────

interface AssignDialogProps {
  onClose: () => void;
  onAssigned: (review: Review) => void;
  toast: (msg: string, type?: "success" | "error") => void;
}

function AssignReviewDialog({ onClose, onAssigned, toast }: AssignDialogProps) {
  const [translationId, setTranslationId] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!translationId.trim() || !reviewerName.trim()) return;
    setSubmitting(true);
    try {
      const payload: ReviewCreate = {
        translation_id: translationId.trim(),
        reviewer_name: reviewerName.trim(),
        comments: comments.trim() || undefined,
      };
      const review = await createReview(payload);
      toast("Review assigned successfully", "success");
      onAssigned(review);
      onClose();
    } catch {
      toast("Failed to assign review", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan placeholder:text-muted-foreground";
  const labelCls = "block text-sm font-medium text-foreground mb-1";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Assign Review</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Translation ID</label>
            <input className={`${inputCls} font-mono`} placeholder="UUID of translation" value={translationId} onChange={(e) => setTranslationId(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Reviewer Name</label>
            <input className={inputCls} placeholder="e.g. Jane Smith" value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Comments (optional)</label>
            <textarea className={inputCls} rows={3} placeholder="Initial review notes..." value={comments} onChange={(e) => setComments(e.target.value)} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              {submitting ? "Assigning..." : "Assign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Update Review Dialog ───────────────────────────────────────────────────

interface UpdateDialogProps {
  review: Review;
  onClose: () => void;
  onUpdated: (review: Review) => void;
  toast: (msg: string, type?: "success" | "error") => void;
}

const REVIEW_STATUSES = ["pending", "in_review", "approved", "rejected", "needs_changes"];

function UpdateReviewDialog({ review, onClose, onUpdated, toast }: UpdateDialogProps) {
  const [status, setStatus] = useState(review.status);
  const [comments, setComments] = useState(review.comments ?? "");
  const [score, setScore] = useState<string>(review.score ? String(review.score) : "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: ReviewUpdate = {};
      if (status !== review.status) payload.status = status;
      if (comments !== (review.comments ?? "")) payload.comments = comments;
      if (score !== "" && Number(score) !== review.score) payload.score = Number(score);
      const updated = await updateReview(review.id, payload);
      toast("Review updated", "success");
      onUpdated(updated);
      onClose();
    } catch {
      toast("Failed to update review", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan placeholder:text-muted-foreground";
  const labelCls = "block text-sm font-medium text-foreground mb-1";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Update Review</h2>
        <div className="mb-3 text-sm text-muted-foreground">
          Translation: <span className="font-mono text-xs text-foreground">{review.translation_id.slice(0, 8)}…</span>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              {REVIEW_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Score (1–5)</label>
            <input type="number" min={1} max={5} className={inputCls} placeholder="Leave blank to skip" value={score} onChange={(e) => setScore(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Comments</label>
            <textarea className={inputCls} rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── QA Report Panel ────────────────────────────────────────────────────────

interface QAReportPanelProps {
  report: QAReport;
  onResolve: (checkId: string) => void;
}

function QAReportPanel({ report, onResolve }: QAReportPanelProps) {
  const byGroup = (severity: string) => report.checks.filter((c) => c.severity === severity);

  const Section = ({ severity, checks }: { severity: string; checks: QACheck[] }) => {
    if (checks.length === 0) return null;
    return (
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-foreground uppercase mb-2">
          {severity}s ({checks.length})
        </h4>
        <div className="flex flex-col gap-2">
          {checks.map((c) => (
            <div
              key={c.id}
              className={`rounded-lg border border-border p-3 transition-opacity ${c.is_resolved ? "opacity-50 bg-muted/30" : "bg-card"}`}
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <CheckTypeBadge type={c.check_type} />
                <SeverityBadge severity={c.severity} />
                {c.is_resolved && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Resolved</span>
                )}
              </div>
              <p className="text-sm text-foreground mb-1">{c.message}</p>
              {c.suggestion && (
                <p className="text-xs text-muted-foreground italic">Suggestion: {c.suggestion}</p>
              )}
              {!c.is_resolved && (
                <button onClick={() => onResolve(c.id)} className="mt-2 text-xs font-medium text-brand-cyan hover:underline">
                  Mark resolved
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex gap-4 mb-4 flex-wrap">
        <span className="text-sm font-medium text-red-600 dark:text-red-400">
          {report.error_count} error{report.error_count !== 1 ? "s" : ""}
        </span>
        <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
          {report.warning_count} warning{report.warning_count !== 1 ? "s" : ""}
        </span>
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {report.info_count} info
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {report.unresolved_count} unresolved
        </span>
      </div>
      <Section severity="error" checks={byGroup("error")} />
      <Section severity="warning" checks={byGroup("warning")} />
      <Section severity="info" checks={byGroup("info")} />
      {report.checks.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No QA issues found.</p>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function QAPage() {
  const [activeTab, setActiveTab] = useState<"qa" | "reviews">("qa");
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const [qaTranslationId, setQATranslationId] = useState("");
  const [qaReport, setQAReport] = useState<QAReport | null>(null);
  const [qaLoading, setQALoading] = useState(false);
  const [qaError, setQAError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  function addToast(message: string, type: "success" | "error" = "success") {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  async function handleRunQA() {
    if (!qaTranslationId.trim()) return;
    setQALoading(true);
    setQAError(null);
    setQAReport(null);
    try {
      const report = await runQAChecks(qaTranslationId.trim());
      setQAReport(report);
    } catch {
      setQAError("Failed to run QA checks. Verify the translation ID.");
    } finally {
      setQALoading(false);
    }
  }

  async function handleGetReport() {
    if (!qaTranslationId.trim()) return;
    setQALoading(true);
    setQAError(null);
    setQAReport(null);
    try {
      const report = await getQAReport(qaTranslationId.trim());
      setQAReport(report);
    } catch {
      setQAError("No QA report found for this translation.");
    } finally {
      setQALoading(false);
    }
  }

  async function handleResolve(checkId: string) {
    try {
      await resolveQACheck(checkId);
      if (qaReport) {
        setQAReport({
          ...qaReport,
          checks: qaReport.checks.map((c) =>
            c.id === checkId ? { ...c, is_resolved: true, resolved_at: new Date().toISOString() } : c
          ),
          unresolved_count: qaReport.unresolved_count - 1,
        });
      }
      addToast("Check resolved", "success");
    } catch {
      addToast("Failed to resolve check", "error");
    }
  }

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const result = await getReviews({ status: statusFilter || undefined, limit: 50 });
      setReviews(result.items);
      setReviewsTotal(result.total);
    } catch {
      addToast("Failed to load reviews", "error");
    } finally {
      setReviewsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === "reviews") loadReviews();
  }, [activeTab, loadReviews]);

  function handleAssigned(review: Review) {
    setReviews((prev) => [review, ...prev]);
    setReviewsTotal((n) => n + 1);
  }

  function handleUpdated(updated: Review) {
    setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function handleLoadQueue() {
    setReviewsLoading(true);
    try {
      const queue = await getReviewQueue();
      setReviews(queue);
      setReviewsTotal(queue.length);
    } catch {
      addToast("Failed to load queue", "error");
    } finally {
      setReviewsLoading(false);
    }
  }

  const selectCls = "rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toast toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />

      {showAssignDialog && (
        <AssignReviewDialog onClose={() => setShowAssignDialog(false)} onAssigned={handleAssigned} toast={addToast} />
      )}
      {editingReview && (
        <UpdateReviewDialog review={editingReview} onClose={() => setEditingReview(null)} onUpdated={handleUpdated} toast={addToast} />
      )}

      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Quality Assurance & Review</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {(["qa", "reviews"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab
                  ? "bg-card border border-b-card border-border text-brand-cyan -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "qa" ? "QA Reports" : "Review Queue"}
            </button>
          ))}
        </div>

        {/* ── QA Tab ──────────────────────────────────────────────────────── */}
        {activeTab === "qa" && (
          <div>
            <div className="bg-card rounded-xl border border-border p-5 mb-5">
              <h2 className="text-base font-semibold text-foreground mb-3">Run or Fetch QA Report</h2>
              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex-1 min-w-48">
                  <label className="block text-sm font-medium text-foreground mb-1">Translation ID</label>
                  <input
                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan font-mono placeholder:text-muted-foreground"
                    placeholder="Paste translation UUID…"
                    value={qaTranslationId}
                    onChange={(e) => setQATranslationId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRunQA()}
                  />
                </div>
                <button
                  onClick={handleRunQA}
                  disabled={qaLoading || !qaTranslationId.trim()}
                  className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {qaLoading ? "Running…" : "Run Checks"}
                </button>
                <button
                  onClick={handleGetReport}
                  disabled={qaLoading || !qaTranslationId.trim()}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Get Existing Report
                </button>
              </div>
            </div>

            {qaError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-4">
                {qaError}
              </div>
            )}

            {qaLoading && (
              <div className="text-sm text-muted-foreground animate-pulse">Running checks…</div>
            )}

            {qaReport && !qaLoading && (
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Report for{" "}
                  <span className="font-mono text-xs text-muted-foreground">{qaReport.translation_id.slice(0, 8)}…</span>
                </h3>
                <QAReportPanel report={qaReport} onResolve={handleResolve} />
              </div>
            )}

            {!qaReport && !qaLoading && !qaError && (
              <div className="text-sm text-muted-foreground italic">
                Enter a translation ID and run checks or fetch an existing report.
              </div>
            )}
          </div>
        )}

        {/* ── Reviews Tab ──────────────────────────────────────────────────── */}
        {activeTab === "reviews" && (
          <div>
            <div className="flex gap-2 mb-4 items-center flex-wrap">
              <select className={selectCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="needs_changes">Needs Changes</option>
              </select>
              <button onClick={loadReviews} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Refresh
              </button>
              <button onClick={handleLoadQueue} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Show Queue
              </button>
              <div className="flex-1" />
              <button onClick={() => setShowAssignDialog(true)} className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                + Assign Review
              </button>
            </div>

            {reviewsLoading && (
              <div className="text-sm text-muted-foreground animate-pulse">Loading reviews…</div>
            )}

            {!reviewsLoading && reviews.length === 0 && (
              <div className="text-sm text-muted-foreground italic">No reviews found.</div>
            )}

            {!reviewsLoading && reviews.length > 0 && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase">
                  {reviewsTotal} review{reviewsTotal !== 1 ? "s" : ""}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted text-xs font-semibold text-muted-foreground uppercase">
                      <th className="px-4 py-3 text-left">Translation</th>
                      <th className="px-4 py-3 text-left">Reviewer</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Score</th>
                      <th className="px-4 py-3 text-left">Assigned</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reviews.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.translation_id.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{r.reviewer_name}</td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{r.score != null ? `${r.score}/5` : "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(r.assigned_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setEditingReview(r)} className="text-brand-cyan hover:underline text-xs font-medium">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
