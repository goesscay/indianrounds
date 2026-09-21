"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./client-api";

/** Loads `path` from the API on mount / when it changes. Pass null to skip. */
export function useApi<T>(path: string | null) {
  const [res, setRes] = useState<{ path: string; data?: T; error?: boolean } | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    apiFetch<T>(path)
      .then((data) => alive && setRes({ path, data }))
      .catch(() => alive && setRes({ path, error: true }));
    return () => {
      alive = false;
    };
  }, [path, nonce]);

  const current = res && res.path === path ? res : null;
  return {
    data: current?.data ?? null,
    error: Boolean(current?.error),
    loading: path !== null && !current,
    reload: () => setNonce((n) => n + 1),
  };
}
