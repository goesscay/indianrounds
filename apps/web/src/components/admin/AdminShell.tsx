"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AdminNav } from "./AdminNav";
import { AdminTopBar } from "./AdminTopBar";

const COLLAPSE_KEY = "ir-admin-sidebar-collapsed";

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveCollapsed(v: boolean) {
  try {
    localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0");
  } catch {
    // Private browsing / blocked storage: the toggle still works, it just won't be remembered.
  }
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => loadCollapsed());

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [loading, user, router, path]);

  if (loading || !user) return <p className="p-16 text-center text-muted">Loading…</p>;

  if (!user.staff) {
    return (
      <div className="mx-auto max-w-md p-16 text-center">
        <h1 className="text-2xl font-extrabold">Staff access only</h1>
        <p className="mt-2 text-muted">Your account does not have access to the back office.</p>
        <Link href="/" className="mt-4 inline-block text-brand-red underline">Back to the website</Link>
      </div>
    );
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      saveCollapsed(next);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-surface-alt lg:flex">
      <aside className={`sticky top-0 hidden h-screen shrink-0 self-start flex-col border-r border-black/10 bg-white transition-[width] duration-150 lg:flex ${collapsed ? "w-[4.25rem]" : "w-64"}`}>
        <Link href="/admin" aria-label="Indian Rounds admin home" className={`flex h-14 shrink-0 items-center bg-brand-red ${collapsed ? "justify-center" : "px-4"}`}>
          <Image
            src={collapsed ? "/brand/icon-white-master.png" : "/brand/logo-footer.png"}
            alt="Indian Rounds"
            width={collapsed ? 28 : 160}
            height={collapsed ? 28 : 33}
            className={collapsed ? "h-7 w-auto" : "h-8 w-auto"}
          />
        </Link>
        <AdminNav user={user} collapsed={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="relative flex h-full w-72 flex-col overflow-y-auto bg-white" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-1"><X size={20} /></button>
            <Link href="/admin" className="mb-1 block bg-brand-red p-4">
              <Image src="/brand/logo-footer.png" alt="Indian Rounds" width={160} height={33} className="h-8 w-auto" />
            </Link>
            <AdminNav user={user} collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminTopBar user={user} onMenu={() => setMobileOpen(true)} collapsed={collapsed} onToggleSidebar={toggleCollapsed} />
        <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
