"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { RequireAuth } from "./RequireAuth";

const tabs = [
  { href: "/account", label: "Overview" },
  { href: "/bookings", label: "Bookings" },
  { href: "/account/credit-notes", label: "Credit notes" },
  { href: "/account/support", label: "Support" },
  { href: "/account/profile", label: "Profile" },
];

export function AccountLayout({ children, title, accent, wide }: { children: ReactNode; title: string; accent?: string; wide?: boolean }) {
  const path = usePathname();

  return (
    <RequireAuth>
      <div className={`mx-auto px-4 py-10 sm:px-6 ${wide ? "max-w-5xl" : "max-w-4xl"}`}>
        <nav aria-label="Account" className="mb-6 flex gap-2 overflow-x-auto border-b border-black/10 pb-3">
          {tabs.map((t) => {
            const active = t.href === "/account" ? path === "/account" : path.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${active ? "bg-brand-red text-white" : "hover:bg-surface-alt"}`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <h1 className="mb-6 text-3xl font-extrabold sm:text-4xl">
          {title} {accent && <span className="text-brand-red">{accent}</span>}
        </h1>
        {children}
      </div>
    </RequireAuth>
  );
}
