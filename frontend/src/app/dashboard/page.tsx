"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getDashboardStats,
  seedDemoData,
  clearDemoData,
  DashboardStats,
} from "@/lib/api";

function statusBadgeClass(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "translating":
    case "extracting":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 rounded-md px-4 py-3 text-sm shadow-lg ${
        type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      {message}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function loadStats() {
    setLoading(true);
    getDashboardStats()
      .then(setStats)
      .catch(() => showToast("Failed to load stats", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedDemoData();
      showToast("Demo data seeded successfully");
      loadStats();
    } catch {
      showToast("Failed to seed demo data", "error");
    } finally {
      setSeeding(false);
    }
  }

  async function handleClear() {
    setClearing(true);
    setConfirmClear(false);
    try {
      await clearDemoData();
      showToast("Demo data cleared");
      loadStats();
    } catch {
      showToast("Failed to clear demo data", "error");
    } finally {
      setClearing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8 space-y-6 bg-background">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 rounded-lg bg-muted animate-pulse" />
          <div className="h-48 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  const empty =
    !stats ||
    (stats.translations_count === 0 &&
      stats.documents_count === 0 &&
      stats.glossary_count === 0);

  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-8">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Translations", value: stats?.translations_count ?? 0, href: "/translations" },
          { label: "Documents", value: stats?.documents_count ?? 0, href: "/documents" },
          { label: "Glossary Terms", value: stats?.glossary_count ?? 0, href: "/glossary" },
          { label: "Pending Reviews", value: stats?.reviews_pending_count ?? 0, href: "/qa" },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-lg border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2"
          >
            <span className="text-3xl font-bold text-brand-cyan">{card.value}</span>
            <span className="text-sm text-muted-foreground">{card.label}</span>
          </Link>
        ))}
      </div>

      {empty ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-1">No data yet</p>
          <p className="text-sm">Seed demo data below or start by creating a translation.</p>
        </div>
      ) : (
        <>
          {/* Row 2: Recent Translations */}
          <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Recent Translations</h2>
              <Link href="/translations" className="text-sm text-brand-cyan hover:underline">
                View all
              </Link>
            </div>
            {stats && stats.recent_translations.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3 text-left">Source</th>
                    <th className="px-6 py-3 text-left">Languages</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.recent_translations.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3 text-foreground max-w-xs truncate">{t.source_text}</td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {t.source_lang.toUpperCase()} → {t.target_lang.toUpperCase()}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{formatRelativeTime(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-6 py-6 text-sm text-muted-foreground">No translations yet.</p>
            )}
          </div>

          {/* Row 3: Recent Documents + QA Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Recent Documents</h2>
                <Link href="/documents" className="text-sm text-brand-cyan hover:underline">
                  View all
                </Link>
              </div>
              {stats && stats.recent_documents.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">File</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.recent_documents.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-foreground max-w-[140px] truncate">{d.filename}</td>
                        <td className="px-4 py-3 text-muted-foreground uppercase text-xs">{d.file_type}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(d.status)}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(d.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-6 py-6 text-sm text-muted-foreground">No documents yet.</p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground">QA Summary</h2>
                <Link href="/qa" className="text-sm text-brand-cyan hover:underline">
                  View all
                </Link>
              </div>
              {stats && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3">
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">Errors</span>
                    <span className="text-xl font-bold text-red-700 dark:text-red-400">{stats.qa_summary.errors}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3">
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Warnings</span>
                    <span className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{stats.qa_summary.warnings}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-3">
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">Resolved</span>
                    <span className="text-xl font-bold text-green-700 dark:text-green-400">{stats.qa_summary.resolved}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Row 4: Quick Actions */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-6">
        <h2 className="font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "New Translation", href: "/translations" },
            { label: "Upload Document", href: "/documents" },
            { label: "Add Term", href: "/glossary" },
            { label: "Review Queue", href: "/qa" },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center justify-center rounded-md border border-brand-cyan px-4 py-2 text-sm font-medium text-brand-cyan hover:bg-brand-cyan hover:text-white transition-colors"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Row 5: Demo Data */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-6">
        <h2 className="font-semibold text-foreground mb-1">Demo Data</h2>
        <p className="text-sm text-muted-foreground mb-4">Seed sample translations, documents, glossary terms, and more.</p>
        <div className="flex gap-3">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="rounded-md border border-brand-cyan px-4 py-2 text-sm font-medium text-brand-cyan hover:bg-brand-cyan hover:text-white transition-colors disabled:opacity-50"
          >
            {seeding ? "Seeding..." : "Seed Demo Data"}
          </button>
          <button
            onClick={() => setConfirmClear(true)}
            disabled={clearing}
            className="rounded-md border border-red-500 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
          >
            {clearing ? "Clearing..." : "Clear Demo Data"}
          </button>
        </div>
      </div>

      {/* Confirm Clear Dialog */}
      {confirmClear && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="rounded-lg bg-card border border-border shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-foreground mb-2">Clear Demo Data?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This will remove all seeded demo data. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmClear(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
