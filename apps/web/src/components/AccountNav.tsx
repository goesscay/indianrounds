"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CalendarCheck, LayoutDashboard, LifeBuoy, UserRound, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "./RequireAuth";

const tabs = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/account/credit-notes", label: "Credit notes", icon: Wallet },
  { href: "/account/support", label: "Support", icon: LifeBuoy },
  { href: "/account/profile", label: "Profile", icon: UserRound },
];

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

function Shell({ children, title, accent, subtitle }: { children: ReactNode; title: string; accent?: string; subtitle?: string }) {
  const path = usePathname();
  const { user } = useAuth();

  return (
    <>
      <header className="bg-gradient-to-br from-ink to-slate-800 text-white">
        <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-red text-xl font-extrabold shadow-lg" aria-hidden>{initials(user?.name ?? "")}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">My account</p>
              <p className="truncate text-lg font-bold">{user?.name}</p>
              <p className="truncate text-sm text-white/70">{user?.email}</p>
            </div>
          </div>
          <nav aria-label="Account" className="no-scrollbar -mx-4 mt-6 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {tabs.map(({ href, label, icon: Icon }) => {
              const active = href === "/account" ? path === "/account" : path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-white text-ink" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                >
                  <Icon size={16} aria-hidden /> {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold sm:text-4xl">
            {title} {accent && <span className="text-brand-red">{accent}</span>}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </>
  );
}

/** Signed-in pages: account header with tabs, then the page. */
export function AccountLayout({ children, title, accent, subtitle }: { children: ReactNode; title: string; accent?: string; subtitle?: string; wide?: boolean }) {
  return (
    <RequireAuth>
      <Shell title={title} accent={accent} subtitle={subtitle}>{children}</Shell>
    </RequireAuth>
  );
}
