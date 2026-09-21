"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { Title } from "./ui";

const metrics: { key: string; label: string; href: string; money?: boolean; warn?: boolean }[] = [
  { key: "bookings_confirmed", label: "Confirmed bookings", href: "/admin/bookings?status=confirmed" },
  { key: "bookings_pending", label: "Awaiting payment", href: "/admin/bookings?status=pending_payment" },
  { key: "departures_next_30_days", label: "Departures in 30 days", href: "/admin/bookings" },
  { key: "collected_total", label: "Collected (all time)", href: "/admin/payments", money: true },
  { key: "collected_30_days", label: "Collected (30 days)", href: "/admin/payments", money: true },
  { key: "overdue_payments", label: "Overdue instalments", href: "/admin/payments", warn: true },
  { key: "leads_new", label: "New leads", href: "/admin/leads?status=new" },
  { key: "refunds_pending", label: "Refunds to handle", href: "/admin/refunds", warn: true },
  { key: "grievances_open", label: "Open tickets", href: "/admin/grievances" },
  { key: "grievances_ack_overdue", label: "Tickets past 48h acknowledgement", href: "/admin/grievances", warn: true },
  { key: "approvals_pending", label: "Approvals waiting", href: "/admin/approvals", warn: true },
];

export function DashboardView() {
  const { user } = useAuth();
  const { data, loading } = useApi<{ data: Record<string, number> }>("admin/dashboard");
  const values = data?.data ?? {};
  const shown = metrics.filter((m) => m.key in values);

  return (
    <>
      <Title title={`Welcome, ${user?.name.split(" ")[0] ?? ""}`} sub={user?.staff?.department_label ? `${user.staff.department_label} · ${user.staff.tier}` : "Super Admin"} />
      {loading && <p className="text-muted">Loading…</p>}
      {!loading && shown.length === 0 && <p className="rounded-card bg-white p-6 text-muted">No dashboard metrics are available for your role yet. Use the menu to open your tools.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((m) => {
          const v = values[m.key];
          return (
            <Link key={m.key} href={m.href} className="rounded-card bg-white p-5 shadow-sm hover:ring-2 hover:ring-brand-red/30">
              <p className="text-sm text-muted">{m.label}</p>
              <p className={`mt-1 text-3xl font-extrabold ${m.warn && v > 0 ? "text-brand-red" : ""}`}>{m.money ? formatINR(v) : v}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
