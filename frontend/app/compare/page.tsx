"use client";
import { useState, useEffect } from "react";
import { TopNav, Footer } from "@/components/Nav";
import { compare, listHospitals } from "@/lib/api";

export default function ComparePage() {
  const [procedure, setProcedure] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [allHospitals, setAllHospitals] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listHospitals({ per_page: 100 }).then((r) => setAllHospitals(r.data.hospitals));
  }, []);

  const toggle = (slug: string) => {
    setSelected(selected.includes(slug) ? selected.filter(s => s !== slug)
      : selected.length < 5 ? [...selected, slug] : selected);
  };

  const run = async () => {
    setError(""); setResult(null);
    if (selected.length < 2) { setError("Select at least 2 hospitals"); return; }
    if (!procedure.trim()) { setError("Enter a procedure"); return; }
    setLoading(true);
    try {
      const r = await compare({ procedure_query: procedure, hospital_slugs: selected });
      setResult(r.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Compare failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 bg-surface px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-headline text-4xl font-extrabold text-primary mb-2">Compare Hospital Prices</h1>
          <p className="text-on-surface-variant mb-8">Select 2-5 hospitals and a procedure to compare prices.</p>

          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm mb-8">
            <label className="block text-sm font-semibold mb-2">Procedure</label>
            <input value={procedure} onChange={(e) => setProcedure(e.target.value)}
                   placeholder="e.g., MRI brain, knee replacement"
                   className="w-full px-4 py-3 bg-surface-container-high rounded-md outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm mb-8">
            <label className="block text-sm font-semibold mb-3">Hospitals ({selected.length}/5 selected)</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
              {allHospitals.map((h) => (
                <label key={h.slug} className={`p-3 rounded-md cursor-pointer text-sm ${selected.includes(h.slug) ? "bg-primary text-white" : "bg-surface-container-high hover:bg-surface-container-highest"}`}>
                  <input type="checkbox" className="mr-2" checked={selected.includes(h.slug)} onChange={() => toggle(h.slug)} />
                  {h.name}
                </label>
              ))}
            </div>
          </div>

          {error && <div className="bg-error-container text-error p-4 rounded-md mb-4">{error}</div>}

          <button onClick={run} disabled={loading} className="w-full md:w-auto bg-primary text-on-primary px-8 py-3 rounded-md font-bold disabled:opacity-50">
            {loading ? "Comparing..." : "Compare Prices"}
          </button>

          {result && (
            <div className="mt-12 bg-surface-container-lowest p-8 rounded-lg shadow-sm">
              <h2 className="font-headline text-2xl font-bold text-primary mb-4">{result.procedure.description}</h2>
              {result.procedure.cpt_code && <p className="text-sm font-mono text-on-surface-variant mb-6">CPT {result.procedure.cpt_code}</p>}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-container text-left text-xs uppercase tracking-widest text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-3">Hospital</th>
                      <th className="px-4 py-3 text-right">Gross</th>
                      <th className="px-4 py-3 text-right">Cash</th>
                      <th className="px-4 py-3 text-right">Min Negotiated</th>
                      <th className="px-4 py-3 text-right">Max Negotiated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.hospitals.map((h: any, i: number) => (
                      <tr key={i} className="border-t border-outline-variant/20">
                        <td className="px-4 py-3"><div className="font-semibold">{h.name}</div><div className="text-xs text-on-surface-variant">{h.city}, {h.state}</div></td>
                        <td className="px-4 py-3 text-right">{fmt(h.gross_charge)}</td>
                        <td className="px-4 py-3 text-right font-bold text-primary">{fmt(h.cash_price)}</td>
                        <td className="px-4 py-3 text-right">{fmt(h.min_negotiated)}</td>
                        <td className="px-4 py-3 text-right">{fmt(h.max_negotiated)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result.savings && (
                <div className="mt-8 bg-primary-container/20 p-6 rounded-lg">
                  <h3 className="font-bold text-primary mb-2">Potential Savings</h3>
                  <p>Cheapest: <strong>{result.savings.cheapest_hospital}</strong></p>
                  <p>Savings vs. most expensive: <strong>{fmt(result.savings.max_vs_min_cash)}</strong></p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
