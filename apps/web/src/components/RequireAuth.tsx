"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [loading, user, router, path]);

  if (loading || !user) {
    return (
      <div role="status" className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
        <span className="size-9 animate-spin rounded-full border-4 border-black/10 border-t-brand-red" aria-hidden />
        <p className="text-sm">{loading ? "Loading your account…" : "Taking you to sign in…"}</p>
      </div>
    );
  }
  return <>{children}</>;
}
