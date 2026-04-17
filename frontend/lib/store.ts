import { create } from "zustand";

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken, refreshToken) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));
    }
    set({ user, accessToken });
  },
  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    }
    set({ user: null, accessToken: null });
  },
  isAdmin: () => get().user?.role === "admin",
}));

export function loadAuthFromStorage() {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem("access_token");
  const userStr = localStorage.getItem("user");
  if (token && userStr) {
    try {
      useAuthStore.setState({ user: JSON.parse(userStr), accessToken: token });
    } catch {}
  }
}
