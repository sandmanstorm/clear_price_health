"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav, Footer } from "@/components/Nav";
import { TaskStatusBar } from "@/components/TaskStatusBar";
import { useAuthStore, loadAuthFromStorage } from "@/lib/store";
import { apiClient } from "@/lib/api";

export default function SourcesPage() {
  const router = useRouter();
  const [coverage, setCoverage] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadAuthFromStorage();
    setTimeout(() => {
      const u = useAuthStore.getState().user;
      if (!u || u.role !== "admin") { router.push("/login"); return; }
      refresh();
    }, 100);
  }, []);

  const refresh = () => apiClient.get("/api/admin/sources/coverage").then((r) => setCoverage(r.data)).catch(() => {});

  const run = async (label: string, endpoint: string, confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true); setMessage(`${label} - queueing...`);
    try {
      const r = await apiClient.post(endpoint);
      setMessage(`${label} queued: task ${r.data.task_id}. ${r.data.note || ""}`);
      setTimeout(refresh, 3000);
    } catch (e: any) {
      setMessage(`${label} FAILED: ${e.response?.data?.detail || e.message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <TaskStatusBar />
      <main className="flex-1 bg-surface px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="font-headline text-4xl font-extrabold text-primary">Hospital Data Sources</h1>
            <p className="text-on-surface-variant mt-2">Populate hospital directory and MRF URLs from multiple sources.</p>
          </div>

          {/* Coverage Card */}
          {coverage && (
            <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm mb-8">
              <h2 className="font-headline text-xl font-bold text-primary mb-4">Coverage</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Stat label="Total Hospitals" value={coverage.total} />
                <Stat label="With MRF URL" value={coverage.with_url} subtitle={`${coverage.coverage_pct}%`} />
                <Stat label="Active (reachable)" value={coverage.active} />
                <Stat label="Data Ingested" value={coverage.ingested} subtitle="have charges" />
              </div>
              {coverage.top_states?.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-widest text-on-surface-variant mb-2">Top states</div>
                  <div className="flex flex-wrap gap-2">
                    {coverage.top_states.map((s: any) => (
                      <span key={s.state} className="bg-surface-container-high px-3 py-1 rounded text-sm">
                        {s.state || "(unknown)"}: {s.with_url}/{s.total}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Workflow */}
          <div className="bg-primary-container/10 border border-primary/20 p-4 rounded-lg mb-6 text-sm">
            <p className="font-semibold mb-2">Recommended order:</p>
            <ol className="list-decimal list-inside space-y-1 text-on-surface-variant">
              <li>Step 1: Import CMS directory (~5,400 hospitals, no URLs)</li>
              <li>Step 2: Fill URLs from Providence + Dolthub + other systems</li>
              <li>Step 3: Validate URLs (HEAD each one, mark dead ones inactive)</li>
              <li>Step 4: (only when ready + disk space) Ingest all active</li>
            </ol>
          </div>

          {message && (
            <div className="bg-secondary-container text-on-secondary-container p-4 rounded-md mb-6 text-sm">
              {message}
            </div>
          )}

          {/* Source Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Action title="Step 1: Import CMS Directory"
                    subtitle="Imports all US acute care + critical access hospitals (~5,400). No URLs. ~2 min."
                    btn="Import CMS Directory"
                    onClick={() => run("CMS Import", "/api/admin/sources/import-cms")}
                    busy={busy} />
            <Action title="Step 2a: Fill URLs - Providence"
                    subtitle="Re-scrapes Providence's transparency page for its ~52 hospitals."
                    btn="Fill Providence URLs"
                    onClick={() => run("Providence URLs", "/api/admin/sources/fill-urls/providence")}
                    busy={busy} />
            <Action title="Step 2b: Fill URLs - Dolthub"
                    subtitle="Best-effort URL fill from community Dolthub dataset (~1,400 URLs, 2021-era, may be stale)."
                    btn="Fill Dolthub URLs"
                    onClick={() => run("Dolthub URLs", "/api/admin/sources/fill-urls/dolthub")}
                    busy={busy} />
            <Action title="Step 3: Validate URLs"
                    subtitle="HEAD each URL, mark dead ones inactive. Run after filling."
                    btn="Validate URLs"
                    onClick={() => run("URL Validation", "/api/admin/sources/validate-urls")}
                    busy={busy} />
            <Action title="Step 4: Ingest ALL Active (DANGER)"
                    subtitle="Queues an ingest for every active hospital. Downloads hundreds of GB to TB. Ensure disk space!"
                    btn="⚠ Ingest All Active"
                    danger
                    onClick={() => run("Ingest All", "/api/admin/ingest/all-active",
                      "WARNING: This will download MRF files for ALL active hospitals. Total size could be 100s of GB to 1+ TB. Are you SURE you have enough disk space?")}
                    busy={busy} />
            <Action title="Refresh Coverage"
                    subtitle="Re-check coverage stats."
                    btn="Refresh"
                    onClick={refresh}
                    busy={busy} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value, subtitle }: { label: string; value: number; subtitle?: string }) {
  return (
    <div>
      <div className="text-3xl font-extrabold text-primary">{(value || 0).toLocaleString()}</div>
      <div className="text-xs uppercase tracking-widest text-on-surface-variant mt-1">{label}</div>
      {subtitle && <div className="text-xs text-on-surface-variant">{subtitle}</div>}
    </div>
  );
}

function Action({ title, subtitle, btn, onClick, busy, danger }: any) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm">
      <h3 className="font-bold text-on-surface mb-1">{title}</h3>
      <p className="text-sm text-on-surface-variant mb-4">{subtitle}</p>
      <button onClick={onClick} disabled={busy}
              className={`w-full py-2 rounded-md font-semibold text-sm disabled:opacity-50 ${danger ? "bg-error text-on-error" : "bg-primary text-on-primary"}`}>
        {btn}
      </button>
    </div>
  );
}
