"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopNav, Footer } from "@/components/Nav";
import { TaskStatusBar } from "@/components/TaskStatusBar";
import { useAuthStore, loadAuthFromStorage } from "@/lib/store";
import { adminStats, ingestStatus, triggerProvidenceIngest } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<any>({});
  const [ingest, setIngest] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadAuthFromStorage();
    setTimeout(() => {
      const u = useAuthStore.getState().user;
      if (!u || u.role !== "admin") { router.push("/login"); return; }
      adminStats().then((r) => setStats(r.data)).catch(() => {});
      ingestStatus().then((r) => setIngest(r.data)).catch(() => {});
    }, 100);
  }, []);

  const runIngest = async () => {
    setMessage("");
    try {
      const r = await triggerProvidenceIngest();
      setMessage(`Ingest queued: task ${r.data.task_id}`);
      setTimeout(() => ingestStatus().then((r) => setIngest(r.data)), 2000);
    } catch (e: any) {
      setMessage("Failed: " + (e.response?.data?.detail || e.message));
    }
  };

  if (!user || user.role !== "admin") return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <TaskStatusBar />
      <main className="flex-1 bg-surface px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="font-headline text-4xl font-extrabold text-primary">Admin Dashboard</h1>
            <div className="flex gap-2 flex-wrap">
              <Link href="/admin/hospitals" className="bg-surface-container-high text-on-surface px-4 py-2 rounded-md font-bold text-sm">
                Hospitals
              </Link>
              <Link href="/admin/sources" className="bg-surface-container-high text-on-surface px-4 py-2 rounded-md font-bold text-sm">
                Data Sources
              </Link>
              <Link href="/admin/settings" className="bg-primary text-on-primary px-4 py-2 rounded-md font-bold text-sm">
                Settings
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-extrabold text-primary">{stats.hospitals || 0}</div>
              <div className="text-xs uppercase tracking-widest text-on-surface-variant mt-1">Hospitals</div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-extrabold text-primary">{(stats.procedures || 0).toLocaleString()}</div>
              <div className="text-xs uppercase tracking-widest text-on-surface-variant mt-1">Procedures</div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-extrabold text-primary">{(stats.charges || 0).toLocaleString()}</div>
              <div className="text-xs uppercase tracking-widest text-on-surface-variant mt-1">Charges</div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm">
              <div className="text-sm font-semibold">
                {stats.last_ingest ? new Date(stats.last_ingest).toLocaleString() : "Never"}
              </div>
              <div className="text-xs uppercase tracking-widest text-on-surface-variant mt-1">Last Ingest</div>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-headline text-xl font-bold">Data Ingestion</h2>
              <button onClick={runIngest} className="bg-primary text-on-primary px-4 py-2 rounded-md font-semibold text-sm">
                Run Providence Ingest
              </button>
            </div>
            {message && <div className="bg-secondary-container p-3 rounded-md mb-4 text-sm">{message}</div>}
            <div className="text-xs text-on-surface-variant mb-3">Recent ingest log:</div>
            <table className="w-full text-sm">
              <thead className="bg-surface-container text-left text-xs uppercase">
                <tr><th className="px-3 py-2">Hospital</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Rows</th><th className="px-3 py-2 text-right">Duration</th><th className="px-3 py-2">Time</th></tr>
              </thead>
              <tbody>
                {ingest.slice(0, 10).map((r) => (
                  <tr key={r.id} className="border-t border-outline-variant/20">
                    <td className="px-3 py-2">{r.hospital || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.status === "success" ? "bg-secondary-container text-on-secondary-container" : r.status === "failed" ? "bg-error-container text-error" : "bg-surface-container-high"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{(r.rows || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{r.duration ? `${r.duration}s` : "—"}</td>
                    <td className="px-3 py-2 text-xs text-on-surface-variant">{r.ran_at ? new Date(r.ran_at).toLocaleString() : ""}</td>
                  </tr>
                ))}
                {ingest.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-on-surface-variant">No ingests yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
