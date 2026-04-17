"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav, Footer } from "@/components/Nav";
import { listHospitals, listStates } from "@/lib/api";

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { listStates().then((r) => setStates(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    listHospitals({ state: state || undefined, page, per_page: 20 })
      .then((r) => { setHospitals(r.data.hospitals); setTotal(r.data.total); });
  }, [state, page]);

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 px-6 py-12 bg-surface">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-headline text-4xl font-extrabold text-primary mb-2">Hospital Directory</h1>
          <p className="text-on-surface-variant mb-8">{total} hospitals with verified pricing data.</p>

          <div className="flex flex-wrap gap-2 mb-8">
            <button onClick={() => setState("")} className={`px-4 py-2 rounded-md text-sm font-semibold ${!state ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant"}`}>
              All States
            </button>
            {states.map((s) => (
              <button key={s.state} onClick={() => setState(s.state)}
                      className={`px-4 py-2 rounded-md text-sm font-semibold ${state === s.state ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant"}`}>
                {s.state} ({s.count})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hospitals.map((h) => (
              <Link key={h.slug} href={`/hospital/${h.slug}`}
                    className="bg-surface-container-lowest asymmetric-card-reverse p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-headline font-bold text-xl text-on-surface mb-1">{h.name}</h3>
                <p className="text-sm text-on-surface-variant mb-4">{h.city}, {h.state}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-widest text-on-surface-variant font-label">Procedures</span>
                  <span className="font-bold text-primary">{(h.procedure_count || 0).toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>

          {total > 20 && (
            <div className="flex justify-center gap-2 mt-8">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                      className="px-4 py-2 bg-surface-container-high rounded-md disabled:opacity-50">Previous</button>
              <span className="px-4 py-2">Page {page} of {Math.ceil(total / 20)}</span>
              <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}
                      className="px-4 py-2 bg-surface-container-high rounded-md disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
