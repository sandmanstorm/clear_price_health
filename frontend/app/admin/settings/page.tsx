"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav, Footer } from "@/components/Nav";
import { TaskStatusBar } from "@/components/TaskStatusBar";
import { useAuthStore, loadAuthFromStorage } from "@/lib/store";
import {
  getAdminSettings, updateAdminSetting, reloadSettings,
  testEmail, testAI, testGoogleOAuth,
} from "@/lib/api";

const SECTIONS: Record<string, { title: string; keys: string[] }> = {
  ai: {
    title: "AI / Claude Configuration",
    keys: ["anthropic_api_key", "claude_model", "ai_enabled"],
  },
  google: {
    title: "Google OAuth",
    keys: ["google_client_id", "google_client_secret", "google_redirect_uri", "google_oauth_enabled"],
  },
  email: {
    title: "Email / SMTP",
    keys: ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from"],
  },
};

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<any[]>([]);
  const [section, setSection] = useState<"ai" | "google" | "email">("ai");
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<Record<string, any>>({});

  useEffect(() => {
    loadAuthFromStorage();
    setTimeout(() => {
      const u = useAuthStore.getState().user;
      if (!u || u.role !== "admin") { router.push("/login"); return; }
      reload();
    }, 100);
  }, []);

  const reload = () => getAdminSettings().then((r) => setSettings(r.data)).catch(() => {});

  const save = async (key: string) => {
    const value = values[key] ?? "";
    setSaving({ ...saving, [key]: true });
    try {
      await updateAdminSetting(key, value);
      setSaved({ ...saved, [key]: true });
      setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000);
      reload();
      setValues({ ...values, [key]: "" });
    } finally { setSaving({ ...saving, [key]: false }); }
  };

  const runTest = async (kind: string) => {
    setTestResult({ ...testResult, [kind]: { loading: true } });
    try {
      if (kind === "ai") {
        const r = await testAI();
        setTestResult({ ...testResult, ai: r.data });
      } else if (kind === "email") {
        const email = prompt("Send test email to:");
        if (!email) { setTestResult({ ...testResult, email: null }); return; }
        const r = await testEmail(email);
        setTestResult({ ...testResult, email: r.data });
      } else if (kind === "google") {
        const r = await testGoogleOAuth();
        setTestResult({ ...testResult, google: r.data });
      }
    } catch (e: any) {
      setTestResult({ ...testResult, [kind]: { error: e.response?.data?.detail || e.message } });
    }
  };

  const findSetting = (key: string) => settings.find((s) => s.key === key);

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <TaskStatusBar />
      <main className="flex-1 bg-surface px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="font-headline text-4xl font-extrabold text-primary">Admin Settings</h1>
            <button onClick={() => reloadSettings().then(reload)} className="bg-surface-container-high px-4 py-2 rounded-md text-sm font-semibold">
              Reload All Cache
            </button>
          </div>

          <div className="bg-primary-container/10 border border-primary/20 p-4 rounded-lg mb-6 text-sm flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">lock</span>
            <div>Sensitive values are encrypted at rest. They are never returned to the browser after saving.</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <aside className="md:col-span-1">
              <nav className="flex flex-col gap-1">
                {Object.entries(SECTIONS).map(([key, cfg]) => (
                  <button key={key} onClick={() => setSection(key as any)}
                          className={`text-left px-4 py-3 rounded-md font-semibold text-sm ${section === key ? "bg-primary text-white" : "hover:bg-surface-container"}`}>
                    {cfg.title}
                  </button>
                ))}
              </nav>
            </aside>

            <div className="md:col-span-3 bg-surface-container-lowest p-8 rounded-lg shadow-sm">
              <h2 className="font-headline text-2xl font-bold text-primary mb-6">{SECTIONS[section].title}</h2>

              <div className="space-y-5">
                {SECTIONS[section].keys.map((key) => {
                  const s = findSetting(key);
                  if (!s) return null;
                  const isBool = s.value_type === "bool";
                  const current = values[key] ?? "";
                  return (
                    <div key={key} className="border-b border-outline-variant/20 pb-5 last:border-b-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <label className="font-semibold text-on-surface">{key}</label>
                          {s.description && <p className="text-xs text-on-surface-variant mt-1">{s.description}</p>}
                        </div>
                        {s.is_sensitive && s.is_set && (
                          <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-1 rounded">SET</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {isBool ? (
                          <select value={current || s.value || "false"}
                                  onChange={async (e) => {
                                    setValues({ ...values, [key]: e.target.value });
                                    await updateAdminSetting(key, e.target.value);
                                    reload();
                                  }}
                                  className="flex-1 px-4 py-2 bg-surface-container-high rounded-md outline-none focus:ring-2 focus:ring-primary">
                            <option value="true">Enabled</option>
                            <option value="false">Disabled</option>
                          </select>
                        ) : (
                          <input
                            type={s.is_sensitive ? "password" : "text"}
                            value={current}
                            onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                            placeholder={s.is_sensitive && s.is_set ? "●●●●●●●● (set) — enter new value to change" : s.value || ""}
                            className="flex-1 px-4 py-2 bg-surface-container-high rounded-md outline-none focus:ring-2 focus:ring-primary"
                          />
                        )}
                        {!isBool && (
                          <button onClick={() => save(key)} disabled={saving[key] || !current}
                                  className="bg-primary text-on-primary px-4 py-2 rounded-md font-semibold disabled:opacity-50 text-sm">
                            {saving[key] ? "Saving..." : saved[key] ? "✓ Saved" : "Save"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-outline-variant/20">
                {section === "ai" && (
                  <button onClick={() => runTest("ai")} className="bg-surface-container-high px-6 py-2 rounded-md font-semibold text-sm">
                    Test AI Connection
                  </button>
                )}
                {section === "google" && (
                  <button onClick={() => runTest("google")} className="bg-surface-container-high px-6 py-2 rounded-md font-semibold text-sm">
                    Test OAuth Config
                  </button>
                )}
                {section === "email" && (
                  <button onClick={() => runTest("email")} className="bg-surface-container-high px-6 py-2 rounded-md font-semibold text-sm">
                    Send Test Email
                  </button>
                )}
                {testResult[section] && (
                  <div className={`mt-4 p-4 rounded-md text-sm ${testResult[section].success ? "bg-secondary-container text-on-secondary-container" : "bg-error-container text-error"}`}>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(testResult[section], null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
