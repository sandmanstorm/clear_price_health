"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthStore, loadAuthFromStorage } from "@/lib/store";

export function TopNav() {
  const user = useAuthStore((s) => s.user);
  useEffect(() => { loadAuthFromStorage(); }, []);

  return (
    <header className="w-full top-0 left-0 bg-gradient-to-r from-[#00478d] to-[#005eb8] shadow-lg flex justify-between items-center px-8 py-4 z-50">
      <Link href="/" className="text-2xl font-bold tracking-tighter text-white font-headline">
        ClearPrice
      </Link>
      <nav className="hidden md:flex items-center space-x-8 font-headline font-semibold tracking-tight">
        <Link href="/search" className="text-blue-100/80 hover:text-white transition-colors">Find Care</Link>
        <Link href="/compare" className="text-blue-100/80 hover:text-white transition-colors">Compare</Link>
        <Link href="/hospitals" className="text-blue-100/80 hover:text-white transition-colors">Hospitals</Link>
        <Link href="/guide" className="text-blue-100/80 hover:text-white transition-colors">How to Use</Link>
      </nav>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            {user.role === "admin" && (
              <Link href="/admin" className="text-white text-sm hover:underline">Admin</Link>
            )}
            <span className="text-blue-100/80 text-sm hidden md:inline">{user.email}</span>
            <button
              onClick={() => { useAuthStore.getState().clearAuth(); window.location.href = "/"; }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-all">
              Logout
            </button>
          </>
        ) : (
          <Link href="/login" className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-all">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center px-8 py-12 font-label text-xs uppercase tracking-widest">
      <div className="text-slate-400 mb-8 md:mb-0">
        © 2024 ClearPrice Healthcare Transparency. All rights reserved.
      </div>
      <div className="flex flex-wrap justify-center gap-6">
        <Link className="text-slate-400 hover:text-slate-600" href="/about">About</Link>
        <Link className="text-slate-400 hover:text-slate-600" href="/guide">How to Use</Link>
        <Link className="text-slate-400 hover:text-slate-600" href="/methodology">Data Methodology</Link>
        <Link className="text-slate-400 hover:text-slate-600" href="/privacy">Privacy</Link>
        <Link className="text-slate-400 hover:text-slate-600" href="/terms">Terms</Link>
        <Link className="text-slate-400 hover:text-slate-600" href="/disclaimer">Disclaimer</Link>
        <Link className="text-slate-400 hover:text-slate-600" href="/contact">Contact</Link>
      </div>
    </footer>
  );
}
