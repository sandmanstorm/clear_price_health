import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://10.10.100.33:8000",
  headers: { "Content-Type": "application/json" },
});

if (typeof window !== "undefined") {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  api.interceptors.response.use(
    (r) => r,
    async (error) => {
      if (error.response?.status === 401) {
        const refresh = localStorage.getItem("refresh_token");
        if (refresh && !error.config._retry) {
          error.config._retry = true;
          try {
            const r = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
              { refresh_token: refresh }
            );
            localStorage.setItem("access_token", r.data.access_token);
            localStorage.setItem("refresh_token", r.data.refresh_token);
            error.config.headers.Authorization = `Bearer ${r.data.access_token}`;
            return api.request(error.config);
          } catch {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
              window.location.href = "/login";
            }
          }
        }
      }
      return Promise.reject(error);
    }
  );
}

export const apiClient = api;

// Auth
export const login = (email: string, password: string) =>
  api.post("/api/auth/login", { email, password });
export const register = (email: string, password: string, full_name?: string) =>
  api.post("/api/auth/register", { email, password, full_name });
export const getMe = () => api.get("/api/auth/me");
export const logout = () => api.post("/api/auth/logout");

// Hospitals
export const listHospitals = (params: any) => api.get("/api/hospitals", { params });
export const getHospital = (slug: string) => api.get(`/api/hospitals/${slug}`);
export const listStates = () => api.get("/api/hospitals/states");

// Search
export const search = (params: any) => api.get("/api/search", { params });
export const suggestions = (q: string) => api.get("/api/search/suggestions", { params: { q } });

// Compare
export const compare = (body: any) => api.post("/api/compare", body);

// AI
export const aiAsk = (question: string, hospital_slug?: string) =>
  api.post("/api/ai/ask", { question, hospital_slug });
export const aiStatus = () => api.get("/api/ai/status");
export const aiHospitalSummary = (slug: string) => api.get(`/api/ai/hospital/${slug}/summary`);
export const aiCompareExplain = (comparison: any) => api.post("/api/ai/compare/explain", { comparison });

// Admin
export const adminStats = () => api.get("/api/admin/stats");
export const getAdminSettings = () => api.get("/api/admin/settings");
export const updateAdminSetting = (key: string, value: string) =>
  api.put(`/api/admin/settings/${key}`, { value });
export const reloadSettings = () => api.post("/api/admin/settings/reload");
export const testEmail = (to: string) => api.post("/api/admin/settings/test-email", { to });
export const testAI = () => api.post("/api/admin/settings/test-ai");
export const testGoogleOAuth = () => api.post("/api/admin/settings/test-google-oauth");
export const toggleAI = (enabled: boolean) => api.post("/api/admin/ai/toggle", { enabled });
export const ingestStatus = () => api.get("/api/admin/ingest/status");
export const triggerProvidenceIngest = () => api.post("/api/admin/ingest/providence");
export const adminHospitals = () => api.get("/api/admin/hospitals");
