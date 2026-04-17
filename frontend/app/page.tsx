"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TopNav, Footer } from "@/components/Nav";
import { adminStats, listHospitals } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [procedure, setProcedure] = useState("");
  const [location, setLocation] = useState("");
  const [stats, setStats] = useState({ hospitals: 0, procedures: 0, charges: 0 });
  const [hospitals, setHospitals] = useState<any[]>([]);

  useEffect(() => {
    adminStats().then((r) => setStats(r.data)).catch(() => {});
    listHospitals({ per_page: 3 }).then((r) => setHospitals(r.data.hospitals)).catch(() => {});
  }, []);

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const q = procedure.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative min-h-[500px] flex flex-col items-center justify-center text-center px-6 py-24 bg-[#00478d]">
          <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full"
                 style={{ background: "radial-gradient(circle at 50% 50%, #005eb8 0%, transparent 70%)" }} />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white mb-6 leading-tight">
              Healthcare Price Transparency Restored.
            </h1>
            <p className="text-xl md:text-2xl text-blue-100/90 font-body mb-12 max-w-2xl mx-auto">
              Navigate the complex world of medical pricing with real-time price parity data
              and hospital transparency scores.
            </p>
            <form onSubmit={go} className="w-full max-w-3xl mx-auto bg-surface-container-lowest shadow-2xl p-2 rounded-lg flex flex-col md:flex-row items-center gap-2">
              <div className="flex-1 w-full flex items-center px-4 bg-surface-container-highest rounded-md">
                <span className="material-symbols-outlined text-outline">search</span>
                <input
                  value={procedure}
                  onChange={(e) => setProcedure(e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 py-4 text-on-surface font-body outline-none"
                  placeholder="Search procedure (e.g., MRI, Hip Replacement)"
                />
              </div>
              <div className="flex-1 w-full flex items-center px-4 bg-surface-container-highest rounded-md">
                <span className="material-symbols-outlined text-outline">location_on</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 py-4 text-on-surface font-body outline-none"
                  placeholder="Hospital or City (optional)"
                />
              </div>
              <button type="submit" className="w-full md:w-auto bg-primary text-on-primary px-10 py-4 font-bold rounded-md hover:bg-primary-container transition-all">
                Analyze Prices
              </button>
            </form>
          </div>
        </section>

        {/* Compliance & Authority Cards */}
        <section className="py-20 px-8 bg-surface">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-surface-container-low p-10 asymmetric-card flex flex-col gap-6 group hover:bg-surface-container transition-colors">
              <div className="w-16 h-16 bg-primary-container rounded-lg flex items-center justify-center text-white shadow-lg">
                <span className="material-symbols-outlined text-4xl">verified_user</span>
              </div>
              <h2 className="text-3xl font-bold font-headline text-primary">CMS Compliance</h2>
              <p className="text-lg text-on-surface-variant font-body leading-relaxed">
                Every medical provider in our database is strictly audited for 2024 CMS transparency
                compliance. We filter out providers that fail to disclose machine-readable files.
              </p>
            </div>
            <div className="bg-surface-container-low p-10 asymmetric-card flex flex-col gap-6 group hover:bg-surface-container transition-colors">
              <div className="w-16 h-16 bg-primary-container rounded-lg flex items-center justify-center text-white shadow-lg">
                <span className="material-symbols-outlined text-4xl">person</span>
              </div>
              <h2 className="text-3xl font-bold font-headline text-primary">Patient Authority</h2>
              <p className="text-lg text-on-surface-variant font-body leading-relaxed">
                Empowering patients with comparative cost analysis. Know the negotiated rate for
                your specific insurance plan before stepping foot in the clinic.
              </p>
            </div>
          </div>
        </section>

        {/* Featured Providers */}
        <section className="py-20 px-8 bg-surface-container-low">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight">
                  Featured Hospitals
                </h2>
                <p className="text-on-surface-variant font-body mt-2">
                  Hospitals with verified transparency data.
                </p>
              </div>
              <Link href="/hospitals" className="hidden md:block font-bold text-primary border-2 border-primary px-6 py-2 rounded-md hover:bg-primary hover:text-white transition-all">
                View All Hospitals
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {hospitals.map((h) => (
                <div key={h.slug} className="bg-surface-container-lowest p-6 flex flex-col md:flex-row items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-6 w-full md:w-1/3">
                    <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">local_hospital</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-on-surface">{h.name}</h3>
                      <p className="text-sm text-on-surface-variant">{h.city}, {h.state}</p>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-8 items-center w-full md:w-auto mt-6 md:mt-0">
                    <div className="text-center md:text-left">
                      <span className="text-xs uppercase tracking-widest text-on-surface-variant font-label">Procedures</span>
                      <div className="font-bold text-primary">{h.procedure_count.toLocaleString()}</div>
                    </div>
                    <Link href={`/hospital/${h.slug}`} className="bg-primary text-on-primary px-6 py-2 font-bold rounded-md text-sm">
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Bento */}
        <section className="py-20 px-8 bg-surface">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2 bg-[#00478d] p-12 flex flex-col justify-end text-white asymmetric-card min-h-[300px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 -mr-20 -mt-20 rounded-full blur-3xl"></div>
                <span className="text-5xl font-extrabold font-headline mb-4">{stats.hospitals}+</span>
                <p className="text-xl font-body opacity-90">Hospitals indexed with verified machine-readable price data.</p>
              </div>
              <div className="bg-surface-container p-8 flex flex-col justify-center asymmetric-card">
                <span className="text-4xl font-extrabold font-headline text-primary mb-2">{stats.procedures.toLocaleString()}</span>
                <p className="text-sm text-on-surface-variant font-body font-semibold">Procedures indexed across hospitals.</p>
              </div>
              <div className="bg-surface-container p-8 flex flex-col justify-center asymmetric-card">
                <span className="text-4xl font-extrabold font-headline text-primary mb-2">{stats.charges.toLocaleString()}</span>
                <p className="text-sm text-on-surface-variant font-body font-semibold">Charge records in our database.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
