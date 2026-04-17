"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TopNav, Footer } from "@/components/Nav";
import { search } from "@/lib/api";

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQ = params?.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (initialQ) runSearch(initialQ); }, [initialQ]);

  const runSearch = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const r = await search({ q: query, per_page: 50 });
      setResults(r.data.results);
    } finally { setLoading(false); }
  };

  return (
    <>
      <section className="bg-gradient-to-b from-[#00478d] to-[#005eb8] px-8 py-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-headline text-4xl font-extrabold text-white mb-6">Search Procedures</h1>
          <form onSubmit={(e) => { e.preventDefault(); router.push(`/search?q=${encodeURIComponent(q)}`); runSearch(q); }}
                className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)}
                   placeholder="e.g., MRI, knee replacement, appendectomy"
                   className="flex-1 px-6 py-4 rounded-md outline-none focus:ring-2 focus:ring-white" />
            <button type="submit" className="bg-white text-primary px-8 py-4 rounded-md font-bold">Search</button>
          </form>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-8 py-12">
        {loading && <div className="text-center py-12 text-on-surface-variant">Searching...</div>}
        {!loading && results.length === 0 && initialQ && (
          <div className="text-center py-12 text-on-surface-variant">No results for "{initialQ}"</div>
        )}
        <div className="grid grid-cols-1 gap-4">
          {results.map((r, i) => (
            <Link key={i} href={`/hospital/${r.slug}`}
                  className="bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-on-surface">{r.procedure}</h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  {r.hospital} — {r.city}, {r.state}
                  {r.cpt_code && <span className="ml-2 font-mono text-xs">CPT {r.cpt_code}</span>}
                </p>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-widest text-on-surface-variant">Gross</div>
                  <div className="font-semibold">{fmt(r.gross_charge)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-on-surface-variant">Cash</div>
                  <div className="font-bold text-primary">{fmt(r.cash_price)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 bg-surface">
        <Suspense fallback={<div className="p-12 text-center">Loading...</div>}>
          <SearchInner />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
