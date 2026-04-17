"use client";
import Link from "next/link";
import { TopNav, Footer } from "@/components/Nav";

export function LegalLayout({ title, subtitle, children, lastUpdated }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  lastUpdated?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 bg-surface">
        <section className="bg-gradient-to-b from-[#00478d] to-[#005eb8] px-8 py-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-white">{title}</h1>
            {subtitle && <p className="text-blue-100/90 mt-3 text-lg">{subtitle}</p>}
            {lastUpdated && <p className="text-blue-100/70 mt-4 text-sm uppercase tracking-widest">Last updated: {lastUpdated}</p>}
          </div>
        </section>
        <article className="max-w-4xl mx-auto px-8 py-12 prose-legal">
          <style jsx>{`
            .prose-legal :global(h2) { font-family: "Manrope", sans-serif; font-weight: 700; font-size: 1.5rem; color: #00478d; margin-top: 2.5rem; margin-bottom: 0.75rem; }
            .prose-legal :global(h3) { font-family: "Manrope", sans-serif; font-weight: 600; font-size: 1.15rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
            .prose-legal :global(p) { line-height: 1.7; color: #424752; margin-bottom: 1rem; }
            .prose-legal :global(ul) { margin-left: 1.5rem; margin-bottom: 1rem; color: #424752; list-style: disc; }
            .prose-legal :global(li) { margin-bottom: 0.4rem; line-height: 1.6; }
            .prose-legal :global(a) { color: #00478d; text-decoration: underline; }
            .prose-legal :global(strong) { color: #191c1d; font-weight: 700; }
            .prose-legal :global(.callout) { background: #cae2fe; border-left: 4px solid #00478d; padding: 1rem 1.25rem; margin: 1.25rem 0; border-radius: 0.25rem; }
          `}</style>
          {children}
        </article>
      </main>
      <Footer />
    </div>
  );
}
