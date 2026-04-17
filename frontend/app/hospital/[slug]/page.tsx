"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TopNav, Footer } from "@/components/Nav";
import { getHospital, apiClient } from "@/lib/api";

export default function HospitalDetail() {
  const params = useParams();
  const slug = params?.slug as string;
  const [hospital, setHospital] = useState<any>(null);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!slug) return;
    getHospital(slug).then((r) => setHospital(r.data)).catch(() => {});
    loadProcs();
  }, [slug]);

  const loadProcs = (query?: string) => {
    apiClient.get(`/api/hospitals/${slug}/procedures`, { params: { q: query || undefined, per_page: 50 } })
      .then((r) => setProcedures(r.data.procedures));
  };

  if (!hospital) return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 px-6 py-12 bg-surface flex items-center justify-center">Loading...</main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 bg-surface">
        <section className="bg-gradient-to-b from-[#00478d] to-[#005eb8] px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-white mb-2">{hospital.name}</h1>
            <p className="text-blue-100/90">{hospital.city}, {hospital.state}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/10 p-4 rounded-md">
                <div className="text-2xl font-bold text-white">{(hospital.procedure_count || 0).toLocaleString()}</div>
                <div className="text-xs text-blue-100/80 uppercase">Procedures</div>
              </div>
              <div className="bg-white/10 p-4 rounded-md">
                <div className="text-2xl font-bold text-white">{(hospital.charge_count || 0).toLocaleString()}</div>
                <div className="text-xs text-blue-100/80 uppercase">Charges</div>
              </div>
              <div className="bg-white/10 p-4 rounded-md">
                <div className="text-2xl font-bold text-white">{hospital.payer_count || 0}</div>
                <div className="text-xs text-blue-100/80 uppercase">Payers</div>
              </div>
              <div className="bg-white/10 p-4 rounded-md">
                <div className="text-sm font-semibold text-white">
                  {hospital.last_fetched ? new Date(hospital.last_fetched).toLocaleDateString() : "—"}
                </div>
                <div className="text-xs text-blue-100/80 uppercase">Last Updated</div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input value={q} onChange={(e) => setQ(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && loadProcs(q)}
                   placeholder="Search procedures..."
                   className="flex-1 px-4 py-3 bg-surface-container-high rounded-md outline-none focus:ring-2 focus:ring-primary" />
            <button onClick={() => loadProcs(q)} className="bg-primary text-on-primary px-6 py-3 rounded-md font-bold">Search</button>
          </div>

          <div className="bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-surface-container text-left text-xs uppercase tracking-widest text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3">Procedure</th>
                  <th className="px-4 py-3">CPT</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Cash</th>
                  <th className="px-4 py-3 text-right">Min</th>
                  <th className="px-4 py-3 text-right">Max</th>
                </tr>
              </thead>
              <tbody>
                {procedures.map((p, i) => (
                  <tr key={i} className="border-t border-outline-variant/20 hover:bg-surface-container-low">
                    <td className="px-4 py-3 text-sm">{p.description}</td>
                    <td className="px-4 py-3 text-sm font-mono text-on-surface-variant">{p.cpt_code || "—"}</td>
                    <td className="px-4 py-3 text-sm text-right">{fmt(p.gross_charge)}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-primary">{fmt(p.cash_price)}</td>
                    <td className="px-4 py-3 text-sm text-right">{fmt(p.min_negotiated)}</td>
                    <td className="px-4 py-3 text-sm text-right">{fmt(p.max_negotiated)}</td>
                  </tr>
                ))}
                {procedures.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-on-surface-variant">No procedures found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
