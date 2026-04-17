"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register as apiRegister } from "@/lib/api";
import { TopNav, Footer } from "@/components/Nav";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const r = await apiRegister(email, password, name);
      setMessage(r.data.message || "Account created. Check your email.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 flex items-center justify-center px-6 py-16 bg-surface">
        <div className="w-full max-w-md bg-surface-container-lowest p-8 rounded-xl shadow-lg">
          <h1 className="font-headline text-3xl font-extrabold text-primary mb-2">Create Account</h1>
          {error && <div className="bg-error-container text-error p-3 rounded-md mb-4 text-sm">{error}</div>}
          {message ? (
            <div>
              <div className="bg-secondary-container text-on-secondary-container p-4 rounded-md mb-4">{message}</div>
              <Link href="/login" className="text-primary font-semibold">Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
                     className="w-full px-4 py-3 bg-surface-container-high rounded-md outline-none focus:ring-2 focus:ring-primary" />
              <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                     className="w-full px-4 py-3 bg-surface-container-high rounded-md outline-none focus:ring-2 focus:ring-primary" />
              <input type="password" required placeholder="Password" minLength={8} value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full px-4 py-3 bg-surface-container-high rounded-md outline-none focus:ring-2 focus:ring-primary" />
              <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-md font-bold hover:bg-primary-container">
                Create Account
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
