"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login as apiLogin } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { TopNav, Footer } from "@/components/Nav";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const r = await apiLogin(email, password);
      setAuth(r.data.user, r.data.access_token, r.data.refresh_token);
      router.push(r.data.user.role === "admin" ? "/admin" : "/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 flex items-center justify-center px-6 py-16 bg-surface">
        <div className="w-full max-w-md bg-surface-container-lowest p-8 rounded-xl shadow-lg">
          <h1 className="font-headline text-3xl font-extrabold text-primary mb-2">Sign In</h1>
          <p className="text-on-surface-variant mb-6">Access your ClearPrice account</p>
          {error && <div className="bg-error-container text-error p-3 rounded-md mb-4 text-sm">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-high rounded-md border-none focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Password</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-high rounded-md border-none focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-primary text-on-primary py-3 rounded-md font-bold hover:bg-primary-container transition-colors disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-on-surface-variant">
            No account? <Link href="/register" className="text-primary font-semibold hover:underline">Register</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
