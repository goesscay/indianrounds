"use client";

import type { ReactNode } from "react";
import { formatINR } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { Title } from "./ui";

function StatCard({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="rounded-card bg-white p-5 shadow-sm">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${warn ? "text-brand-red" : ""}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-ink/50">{title}</h2>
      {children}
    </section>
  );
}

function BarList({ rows, valueFormat }: { rows: { label: string; value: number; sub?: string }[]; valueFormat?: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-muted">No data yet.</p>;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium capitalize text-ink/80">
              {r.label}
              {r.sub && <span className="ml-1.5 text-xs font-normal text-muted">{r.sub}</span>}
            </span>
            <span className="shrink-0 font-semibold text-ink">{valueFormat ? valueFormat(r.value) : r.value}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-alt">
            <div className="h-1.5 rounded-full bg-brand-red transition-[width]" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

type MonthCount = { month: string; count: number };

function MonthTrend({ rows, valueKey, valueFormat }: { rows: Record<string, unknown>[]; valueKey?: string; valueFormat?: (v: number) => string }) {
  const withValue = rows.map((r) => ({ month: r.month as string, count: (valueKey ? (r[valueKey] as number) : (r.count as number)) ?? 0 }));
  const max = Math.max(1, ...withValue.map((r) => r.count));
  return (
    <div className="flex h-32 items-end gap-2">
      {withValue.map((r) => (
        <div key={r.month} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex h-24 w-full items-end">
            <div className="w-full rounded-t-sm bg-brand-red/80" style={{ height: `${Math.max(4, (r.count / max) * 100)}%` }} title={valueFormat ? valueFormat(r.count) : String(r.count)} />
          </div>
          <span className="text-[10px] font-medium text-muted">{r.month.split(" ")[0]}</span>
        </div>
      ))}
    </div>
  );
}

// Bookings

type BookingsReport = {
  summary: { total: number; confirmed: number; pending: number; cancelled: number; expired: number; total_travellers: number; total_revenue: number; avg_booking_value: number };
  by_status: { status: string; count: number }[];
  by_haul_class: { haul_class: string; count: number }[];
  by_month: (MonthCount & { revenue: number })[];
  top_destinations: { destination: string; count: number; revenue: number }[];
};

export function BookingReportView() {
  const { data, loading } = useApi<{ data: BookingsReport }>("admin/reports/bookings");
  if (loading || !data) return <p className="text-muted">Loading…</p>;
  const r = data.data;

  return (
    <>
      <Title title="Booking reports" sub="Last 6 months of activity" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total bookings" value={r.summary.total} />
        <StatCard label="Confirmed" value={r.summary.confirmed} />
        <StatCard label="Total revenue" value={formatINR(r.summary.total_revenue)} />
        <StatCard label="Avg. booking value" value={formatINR(r.summary.avg_booking_value)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Section title="Revenue trend">
          <MonthTrend rows={r.by_month} valueKey="revenue" valueFormat={formatINR} />
        </Section>
        <Section title="By status">
          <BarList rows={r.by_status.map((s) => ({ label: s.status.replace(/_/g, " "), value: s.count }))} />
        </Section>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Top destinations by revenue">
          <BarList rows={r.top_destinations.map((d) => ({ label: d.destination, value: d.revenue, sub: `${d.count} booking${d.count === 1 ? "" : "s"}` }))} valueFormat={formatINR} />
        </Section>
        <Section title="Short-haul vs. long-haul">
          <BarList rows={r.by_haul_class.map((h) => ({ label: `${h.haul_class}-haul`, value: h.count }))} />
        </Section>
      </div>
    </>
  );
}

// Sales

type SalesReport = {
  summary: { total: number; new: number; won: number; lost: number; conversion_rate: number };
  by_status: { status: string; count: number }[];
  by_source: { source: string; count: number }[];
  by_month: MonthCount[];
};

export function SalesReportView() {
  const { data, loading } = useApi<{ data: SalesReport }>("admin/reports/sales");
  if (loading || !data) return <p className="text-muted">Loading…</p>;
  const r = data.data;

  return (
    <>
      <Title title="Sales reports" sub="Leads and enquiries you have visibility into, last 6 months" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total leads" value={r.summary.total} />
        <StatCard label="New" value={r.summary.new} />
        <StatCard label="Won" value={r.summary.won} />
        <StatCard label="Conversion rate" value={`${r.summary.conversion_rate}%`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Section title="Lead volume">
          <MonthTrend rows={r.by_month} />
        </Section>
        <Section title="By status">
          <BarList rows={r.by_status.map((s) => ({ label: s.status, value: s.count }))} />
        </Section>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="By source">
          <BarList rows={r.by_source.map((s) => ({ label: s.source.replace(/_/g, " "), value: s.count }))} />
        </Section>
      </div>
    </>
  );
}

// Payments

type PaymentsReport = {
  summary: { total_collected: number; total_due: number; overdue_amount: number; overdue_count: number; milestones_paid: number; milestones_due: number };
  by_status: { status: string; count: number; amount: number }[];
  by_month: (MonthCount & { collected: number })[];
};

export function PaymentReportView() {
  const { data, loading } = useApi<{ data: PaymentsReport }>("admin/reports/payments");
  if (loading || !data) return <p className="text-muted">Loading…</p>;
  const r = data.data;

  return (
    <>
      <Title title="Payment reports" sub="Instalments collected and outstanding" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total collected" value={formatINR(r.summary.total_collected)} />
        <StatCard label="Total due" value={formatINR(r.summary.total_due)} />
        <StatCard label="Overdue amount" value={formatINR(r.summary.overdue_amount)} warn={r.summary.overdue_amount > 0} />
        <StatCard label="Overdue instalments" value={r.summary.overdue_count} warn={r.summary.overdue_count > 0} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Section title="Collections trend">
          <MonthTrend rows={r.by_month} valueKey="collected" valueFormat={formatINR} />
        </Section>
        <Section title="By status">
          <BarList rows={r.by_status.map((s) => ({ label: s.status, value: s.amount, sub: `${s.count} instalment${s.count === 1 ? "" : "s"}` }))} valueFormat={formatINR} />
        </Section>
      </div>
    </>
  );
}

// Customers

type CustomersReport = {
  summary: { total: number; new_last_30_days: number; repeat_customers: number; repeat_rate: number };
  by_month: MonthCount[];
  top_customers: { name: string; email: string; bookings_count: number; total_spend: number }[];
};

export function CustomerReportView() {
  const { data, loading } = useApi<{ data: CustomersReport }>("admin/reports/customers");
  if (loading || !data) return <p className="text-muted">Loading…</p>;
  const r = data.data;

  return (
    <>
      <Title title="Customer reports" sub="Who is booking with us" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total customers" value={r.summary.total} />
        <StatCard label="New (30 days)" value={r.summary.new_last_30_days} />
        <StatCard label="Repeat customers" value={r.summary.repeat_customers} />
        <StatCard label="Repeat rate" value={`${r.summary.repeat_rate}%`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Section title="New customers">
          <MonthTrend rows={r.by_month} />
        </Section>
        <Section title="Top customers by spend">
          <BarList rows={r.top_customers.map((c) => ({ label: c.name, value: c.total_spend, sub: `${c.bookings_count} booking${c.bookings_count === 1 ? "" : "s"}` }))} valueFormat={formatINR} />
        </Section>
      </div>
    </>
  );
}
