"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { TopNav, Footer } from "@/components/Nav";
import { TaskStatusBar } from "@/components/TaskStatusBar";
import { useAuthStore, loadAuthFromStorage } from "@/lib/store";
import { apiClient } from "@/lib/api";

interface Hospital {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  cms_id: string | null;
  json_url: string | null;
  is_active: boolean;
  row_count: number;
  last_fetched: string | null;
}

export default function HospitalsManage() {
  const router = useRouter();
  const [data, setData] = useState<{ total: number; hospitals: Hospital[] }>({ total: 0, hospitals: [] });
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [hasUrl, setHasUrl] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Hospital | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAuthFromStorage();
    setTimeout(() => {
      const u = useAuthStore.getState().user;
      if (!u || u.role !== "admin") { router.push("/login"); return; }
      load();
    }, 100);
  }, []);
  useEffect(() => { load(); }, [page, state, hasUrl]);

  const load = () => {
    const params: any = { page, per_page: 50 };
    if (q) params.q = q;
    if (state) params.state = state;
    if (hasUrl) params.has_url = hasUrl;
    apiClient.get("/api/admin/hospitals/manage", { params }).then(r => setData(r.data)).catch(() => {});
  };

  const onIngest = async (id: string) => {
    try {
      const r = await apiClient.post(`/api/admin/hospitals/manage/${id}/ingest`);
      setMessage(`Queued ingest task: ${r.data.task_id}`);
    } catch (e: any) {
      setMessage(`Failed: ${e.response?.data?.detail || e.message}`);
    }
  };

  const onToggleActive = async (h: Hospital) => {
    await apiClient.put(`/api/admin/hospitals/manage/${h.id}`, { is_active: !h.is_active });
    load();
  };

  const onSave = async (h: Partial<Hospital>) => {
    if (editing) {
      await apiClient.put(`/api/admin/hospitals/manage/${editing.id}`, h);
      setEditing(null);
    } else {
      await apiClient.post("/api/admin/hospitals/manage", h);
      setCreating(false);
    }
    load();
  };

  const onUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true); setMessage("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await apiClient.post("/api/admin/hospitals/manage/bulk-upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(`Upload: ${r.data.created} created, ${r.data.updated} updated, ${r.data.errors.length} errors`);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) {
      setMessage(`Upload failed: ${e.response?.data?.detail || e.message}`);
    } finally { setUploading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <TaskStatusBar />
      <main className="flex-1 bg-surface px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="font-headline text-3xl font-extrabold text-primary">Hospital Manager</h1>
            <div className="flex gap-2">
              <button onClick={() => setCreating(true)} className="bg-primary text-on-primary px-4 py-2 rounded-md font-semibold text-sm">
                + Add Hospital
              </button>
              <label className="bg-surface-container-high px-4 py-2 rounded-md font-semibold text-sm cursor-pointer">
                {uploading ? "Uploading..." : "Upload CSV"}
                <input ref={fileRef} type="file" accept=".csv" onChange={onUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2">
            <form onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }} className="flex flex-1 gap-2 min-w-[300px]">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or CMS ID..."
                     className="flex-1 px-3 py-2 bg-surface-container-high rounded-md outline-none text-sm" />
              <button type="submit" className="bg-primary text-on-primary px-4 py-2 rounded-md text-sm">Search</button>
            </form>
            <select value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}
                    className="px-3 py-2 bg-surface-container-high rounded-md text-sm">
              <option value="">All states</option>
              {"AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA PR RI SC SD TN TX UT VT VA WA WV WI WY".split(" ").map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={hasUrl} onChange={(e) => { setHasUrl(e.target.value); setPage(1); }}
                    className="px-3 py-2 bg-surface-container-high rounded-md text-sm">
              <option value="">URL: any</option>
              <option value="yes">Has URL</option>
              <option value="no">No URL</option>
            </select>
          </div>

          {message && <div className="bg-secondary-container text-on-secondary-container p-3 rounded-md mb-4 text-sm">{message}</div>}

          {/* CSV hint */}
          <details className="mb-4 bg-primary-container/10 p-3 rounded text-xs">
            <summary className="cursor-pointer font-semibold text-primary">CSV Upload Format</summary>
            <pre className="mt-2 text-on-surface-variant">
{`Columns (header required): name, state, city, zip, cms_id, json_url, is_active
Example:
name,state,city,zip,cms_id,json_url,is_active
Example Hospital,CA,Los Angeles,90001,050001,https://example.com/charges.json,true

Upsert rules: matched by cms_id first, then by (name + state). New rows created for unmatched.`}
            </pre>
          </details>

          {/* Table */}
          <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-2 text-xs text-on-surface-variant border-b border-outline-variant/20">
              Showing {data.hospitals.length} of {data.total.toLocaleString()} hospitals
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container text-left text-xs uppercase tracking-widest text-on-surface-variant">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">State</th>
                    <th className="px-3 py-2">CMS ID</th>
                    <th className="px-3 py-2">URL</th>
                    <th className="px-3 py-2 text-right">Rows</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hospitals.map(h => (
                    <tr key={h.id} className="border-t border-outline-variant/20 hover:bg-surface-container-low">
                      <td className="px-3 py-2"><div className="font-semibold">{h.name}</div><div className="text-xs text-on-surface-variant">{h.city || "—"}</div></td>
                      <td className="px-3 py-2">{h.state || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{h.cms_id || "—"}</td>
                      <td className="px-3 py-2 max-w-[200px]">
                        {h.json_url ? (
                          <a href={h.json_url} target="_blank" rel="noreferrer" className="text-primary text-xs truncate block hover:underline" title={h.json_url}>
                            {h.json_url.slice(0, 40)}...
                          </a>
                        ) : <span className="text-on-surface-variant text-xs">none</span>}
                      </td>
                      <td className="px-3 py-2 text-right">{(h.row_count || 0).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => onToggleActive(h)} className={`text-xs px-2 py-0.5 rounded ${h.is_active ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-high text-on-surface-variant"}`}>
                          {h.is_active ? "active" : "inactive"}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right space-x-2">
                        <button onClick={() => onIngest(h.id)} disabled={!h.json_url}
                                className="text-xs font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline">
                          ingest
                        </button>
                        <button onClick={() => setEditing(h)} className="text-xs font-semibold text-on-surface hover:underline">edit</button>
                      </td>
                    </tr>
                  ))}
                  {data.hospitals.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-12 text-center text-on-surface-variant">No hospitals found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 flex justify-between items-center text-sm border-t border-outline-variant/20">
              <div className="text-on-surface-variant">Page {page} of {Math.ceil(data.total / 50) || 1}</div>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                        className="px-3 py-1 bg-surface-container-high rounded disabled:opacity-50 text-xs">Prev</button>
                <button disabled={page >= Math.ceil(data.total / 50)} onClick={() => setPage(page + 1)}
                        className="px-3 py-1 bg-surface-container-high rounded disabled:opacity-50 text-xs">Next</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create/Edit Modal */}
      {(editing || creating) && (
        <HospitalForm
          initial={editing || undefined}
          onCancel={() => { setEditing(null); setCreating(false); }}
          onSave={onSave}
        />
      )}

      <Footer />
    </div>
  );
}

function HospitalForm({ initial, onCancel, onSave }: { initial?: Hospital; onCancel: () => void; onSave: (h: any) => void }) {
  const [f, setF] = useState<any>({
    name: initial?.name || "",
    state: initial?.state || "",
    city: initial?.city || "",
    zip: initial?.zip || "",
    cms_id: initial?.cms_id || "",
    json_url: initial?.json_url || "",
    is_active: initial?.is_active ?? true,
  });
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-lg shadow-xl max-w-lg w-full p-6">
        <h2 className="font-headline text-xl font-bold text-primary mb-4">
          {initial ? "Edit Hospital" : "Add Hospital"}
        </h2>
        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold mb-1">Name *</label>
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })}
                   className="w-full px-3 py-2 bg-surface-container-high rounded outline-none" required />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold mb-1">State</label>
              <input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value.toUpperCase().slice(0, 2) })}
                     className="w-full px-3 py-2 bg-surface-container-high rounded outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">City</label>
              <input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}
                     className="w-full px-3 py-2 bg-surface-container-high rounded outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">ZIP</label>
              <input value={f.zip} onChange={(e) => setF({ ...f, zip: e.target.value })}
                     className="w-full px-3 py-2 bg-surface-container-high rounded outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">CMS ID (CCN)</label>
            <input value={f.cms_id} onChange={(e) => setF({ ...f, cms_id: e.target.value })}
                   className="w-full px-3 py-2 bg-surface-container-high rounded outline-none font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">MRF URL (.json)</label>
            <input value={f.json_url} onChange={(e) => setF({ ...f, json_url: e.target.value })}
                   placeholder="https://.../standard-charges.json"
                   className="w-full px-3 py-2 bg-surface-container-high rounded outline-none text-xs" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} />
            <span>Active (include in public listings + auto-ingest)</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} className="px-4 py-2 bg-surface-container-high rounded-md text-sm">Cancel</button>
          <button onClick={() => onSave(f)} disabled={!f.name}
                  className="px-4 py-2 bg-primary text-on-primary rounded-md text-sm font-semibold disabled:opacity-50">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
