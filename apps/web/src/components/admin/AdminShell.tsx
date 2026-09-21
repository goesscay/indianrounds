"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { can, useAuth } from "@/lib/auth";

const nav = [
  { href: "/admin", label: "Dashboard", perm: null },
  { href: "/admin/tours", label: "Tours", perm: "tours.view" },
  { href: "/admin/destinations", label: "Destinations", perm: "destinations.view" },
  { href: "/admin/testimonials", label: "Testimonials", perm: "testimonials.view" },
  { href: "/admin/leads", label: "Leads", perm: "leads.view" },
  { href: "/admin/bookings", label: "Bookings", perm: "bookings.view" },
  { href: "/admin/customers", label: "Customers", perm: "customers.view" },
  { href: "/admin/payments", label: "Payments", perm: "payments.view" },
  { href: "/admin/refunds", label: "Refunds", perm: "refunds.view" },
  { href: "/admin/credit-notes", label: "Credit notes", perm: "credit_notes.view" },
  { href: "/admin/grievances", label: "Grievances", perm: "grievances.view" },
  { href: "/admin/approvals", label: "Approvals", perm: null },
  { href: "/admin/users", label: "Team", perm: "users.manage" },
  { href: "/admin/roles", label: "Roles & access", perm: "users.manage" },
  { href: "/admin/audit", label: "Audit log", perm: "audit.view" },
  { href: "/admin/settings", label: "Settings", perm: "settings.manage" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

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

  const items = nav.filter((n) => n.perm === null || can(user, n.perm));

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <Link href="/admin" className="mb-6 block bg-brand-red p-4">
        <Image src="/brand/logo.jpeg" alt="Indian Rounds" width={160} height={47} className="h-9 w-auto" />
      </Link>
      <ul className="flex-1 space-y-1 px-3">
        {items.map((n) => {
          const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
          return (
            <li key={n.href}>
              <Link href={n.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`block rounded-lg px-3 py-2 text-sm font-semibold ${active ? "bg-brand-red text-white" : "text-ink/80 hover:bg-surface-alt"}`}>
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-black/10 p-4 text-sm">
        <p className="font-semibold">{user.name}</p>
        <p className="text-xs text-muted">{user.staff.department_label ?? "Super Admin"} · {user.staff.department ? user.staff.tier : "all access"}</p>
        <div className="mt-3 flex gap-3 text-xs font-semibold">
          <Link href="/" className="text-brand-red">Website</Link>
          <button onClick={async () => { await logout(); router.push("/login"); }} className="text-muted hover:text-brand-red">Log out</button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-surface-alt lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r border-black/10 bg-white lg:block">{sidebar}</aside>
      <div className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-3 lg:hidden">
        <span className="font-extrabold text-brand-red">Indian Rounds Admin</span>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-full p-2 hover:bg-surface-alt"><Menu size={22} /></button>
      </div>
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="relative h-full w-64 overflow-y-auto bg-white" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-1"><X size={20} /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <main className="min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}
