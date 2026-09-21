"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch, ApiError } from "./client-api";

export type StaffProfile = { tier: "admin" | "staff"; department: string | null; department_label: string | null; permissions: string[] };
export type User = { id: number; name: string; email: string; phone: string | null; gst_state: string | null; staff?: StaffProfile | null };

export const can = (user: User | null, permission: string) => Boolean(user?.staff?.permissions.includes(permission));

type AuthState = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({ user: null, loading: true, refresh: async () => {}, setUser: () => {}, logout: async () => {} });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    return apiFetch<{ data: User }>("me")
      .then((res) => setUser(res.data))
      .catch((e) => {
        if (!(e instanceof ApiError) || e.status !== 401) console.error(e);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let alive = true;
    apiFetch<{ data: User }>("me")
      .then((res) => alive && setUser(res.data))
      .catch((e) => {
        if (!(e instanceof ApiError) || e.status !== 401) console.error(e);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("auth/logout", { method: "POST", body: {} });
    } catch {
      /* cookie is cleared by the proxy either way */
    }
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, refresh, setUser, logout }), [user, loading, refresh, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
