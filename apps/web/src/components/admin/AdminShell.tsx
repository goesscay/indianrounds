"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

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
  const { user, loading, logout } = useAuth();
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
    <div className="min-h-screen bg-surface-alt lg:grid" style={{ gridTemplateColumns: "auto 1fr" }}>
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-black/10 bg-white transition-[width] duration-150 lg:flex ${collapsed ? "w-[4.25rem]" : "w-64"}`}>
        <Link href="/admin" className={`flex items-center bg-brand-red ${collapsed ? "justify-center p-3" : "p-4"}`}>
          <Image
            src={collapsed ? "/brand/icon-white-master.png" : "/brand/logo-footer.png"}
            alt="Indian Rounds"
            width={collapsed ? 28 : 160}
            height={collapsed ? 28 : 33}
            className={collapsed ? "h-7 w-auto" : "h-8 w-auto"}
          />
        </Link>
        <AdminNav user={user} collapsed={collapsed} />
        <div className="border-t border-black/10 p-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-semibold text-ink/60 transition hover:bg-surface-alt hover:text-ink ${collapsed ? "justify-center" : ""}`}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            {!collapsed && "Collapse"}
          </button>
        </div>
        <div className={`border-t border-black/10 p-3 text-sm ${collapsed ? "flex justify-center" : ""}`}>
          {collapsed ? (
            <div className="group relative">
              <div className="grid size-9 place-items-center rounded-full bg-brand-red/10 text-xs font-bold text-brand-red" aria-label={user.name}>
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-float transition group-hover:visible group-hover:opacity-100">
                {user.name} — log out
              </span>
              <button onClick={async () => { await logout(); router.push("/login"); }} aria-label="Log out" className="absolute inset-0" />
            </div>
          ) : (
            <>
              <p className="truncate font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.staff.department_label ?? "Super Admin"} · {user.staff.department ? user.staff.tier : "all access"}</p>
              <div className="mt-2.5 flex items-center gap-3 text-xs font-semibold">
                <Link href="/" className="text-brand-red hover:underline">Website</Link>
                <button onClick={async () => { await logout(); router.push("/login"); }} className="flex items-center gap-1 text-muted hover:text-brand-red">
                  <LogOut size={13} /> Log out
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      <div className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-3 lg:hidden">
        <span className="font-extrabold text-brand-red">Indian Rounds Admin</span>
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-full p-2 hover:bg-surface-alt"><Menu size={22} /></button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="relative flex h-full w-72 flex-col overflow-y-auto bg-white" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-1"><X size={20} /></button>
            <Link href="/admin" className="mb-1 block bg-brand-red p-4">
              <Image src="/brand/logo-footer.png" alt="Indian Rounds" width={160} height={33} className="h-8 w-auto" />
            </Link>
            <AdminNav user={user} collapsed={false} onNavigate={() => setMobileOpen(false)} />
            <div className="border-t border-black/10 p-4 text-sm">
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs text-muted">{user.staff.department_label ?? "Super Admin"} · {user.staff.department ? user.staff.tier : "all access"}</p>
              <div className="mt-3 flex gap-3 text-xs font-semibold">
                <Link href="/" className="text-brand-red">Website</Link>
                <button onClick={async () => { await logout(); router.push("/login"); }} className="text-muted hover:text-brand-red">Log out</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <main className="min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}
