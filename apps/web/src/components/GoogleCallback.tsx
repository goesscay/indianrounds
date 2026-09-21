"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { apiFetch, safeNext } from "@/lib/client-api";
import { useAuth, type User } from "@/lib/auth";

export function GoogleCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get("code");
    const next = safeNext(sessionStorage.getItem("ir_next"));
    sessionStorage.removeItem("ir_next");

    if (!code) {
      router.replace("/login?error=google");
      return;
    }
    apiFetch<{ data: User }>("auth/google/exchange", { body: { code } })
      .then((res) => {
        setUser(res.data);
        router.replace(next);
      })
      .catch(() => router.replace("/login?error=google"));
  }, [params, router, setUser]);

  return <p className="p-16 text-center text-muted">Signing you in…</p>;
}
