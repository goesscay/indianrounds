"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CalendarX2, FileText, Headset, Map as MapIcon, Moon, Phone, ReceiptText, Users, Wallet } from "lucide-react";
import type { Booking } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format";
import { site } from "@/lib/site";
import { useApi } from "@/lib/use-api";
import { AccountLayout } from "./AccountNav";
import { Card, EmptyState, ListSkeleton, OutlineLink, PaidBar, PrimaryLink, StatusBadge, daysUntil } from "./AccountUI";
import { CancelBookingDialog } from "./CancelBookingDialog";
import { MilestoneList } from "./MilestoneList";

type Filter = "all" | "upcoming" | "past" | "closed";
const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "closed", label: "Cancelled or expired" },
];

const isLive = (b: Booking) => b.status === "confirmed" || b.status === "pending_payment";
const dayMonth = (iso: string) => ({ day: formatDate(iso, { day: "numeric" }), month: formatDate(iso, { month: "short" }) });

function groupOf(b: Booking, today: string): Exclude<Filter, "all"> {
  if (!isLive(b)) return "closed";
  return b.departure.starts_on >= today ? "upcoming" : "past";
}

function BookingCard({ b }: { b: Booking }) {
  const { day, month } = dayMonth(b.departure.starts_on);
  const balance = Math.max(0, b.total_amount - b.paid_amount);
  const nextDue = b.milestones.find((m) => m.status === "due");
  const toGo = daysUntil(b.departure.starts_on);
  const muted = !isLive(b);

  return (
    <Link href={`/bookings/${b.reference}`} className={`group flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-red hover:shadow-float sm:flex-row sm:items-center ${muted ? "opacity-80" : ""}`}>
      <div className={`grid size-16 shrink-0 place-items-center rounded-2xl text-center leading-none ${muted ? "bg-gray-100 text-gray-500" : "bg-brand-red/10 text-brand-red"}`} aria-hidden>
        <span>
          <span className="block text-2xl font-extrabold">{day}</span>
          <span className="mt-0.5 block text-xs font-bold uppercase">{month}</span>
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={b.status} />
          {isLive(b) && toGo >= 0 && <span className="text-xs font-semibold text-muted">{toGo === 0 ? "Departs today" : `In ${toGo} day${toGo === 1 ? "" : "s"}`}</span>}
        </div>
        <p className="mt-1.5 text-lg font-bold leading-snug group-hover:text-brand-red">{b.tour.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="font-mono">{b.reference}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays size={13} aria-hidden /> {formatDate(b.departure.starts_on)} – {formatDate(b.departure.ends_on)}</span>
          <span className="inline-flex items-center gap-1"><Users size={13} aria-hidden /> {b.traveller_count} traveller{b.traveller_count === 1 ? "" : "s"}</span>
        </p>
        {isLive(b) && nextDue && (
          <p className="mt-2 inline-block rounded-lg bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
            Next payment {formatINR(nextDue.amount)} due {formatDate(nextDue.due_on)}
          </p>
        )}
      </div>

      <div className="shrink-0 sm:w-44 sm:text-right">
        <p className="text-xl font-extrabold">{formatINR(b.total_amount)}</p>
        {isLive(b) && (
          <>
            <div className="mt-2"><PaidBar paid={b.paid_amount} total={b.total_amount} /></div>
            <p className="mt-1 text-xs text-muted">{balance > 0 ? `${formatINR(b.paid_amount)} paid · ${formatINR(balance)} to pay` : "Fully paid"}</p>
          </>
        )}
        <span className="mt-2 hidden items-center gap-1 text-xs font-semibold text-brand-red sm:inline-flex sm:justify-end">View booking <ArrowRight size={13} aria-hidden /></span>
      </div>
    </Link>
  );
}

export function BookingsList() {
  const { data, loading } = useApi<{ data: Booking[] }>("bookings");
  const [filter, setFilter] = useState<Filter>("all");
  const today = new Date().toISOString().slice(0, 10);

  const items = useMemo(() => [...(data?.data ?? [])].sort((a, b) => b.departure.starts_on.localeCompare(a.departure.starts_on)), [data]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: items.length, upcoming: 0, past: 0, closed: 0 };
    for (const b of items) c[groupOf(b, today)]++;
    return c;
  }, [items, today]);
  const shown = filter === "all" ? items : items.filter((b) => groupOf(b, today) === filter);
  // Upcoming trips read best soonest-first.
  if (filter === "upcoming") shown.sort((a, b) => a.departure.starts_on.localeCompare(b.departure.starts_on));

  return (
    <AccountLayout title="My" accent="bookings" subtitle="Your trips, payments, itineraries and invoices in one place.">
      {loading && <ListSkeleton />}
      {!loading && items.length === 0 && (
        <EmptyState icon={MapIcon} title="No bookings yet" text="When you book a trip it will appear here, with your payment schedule, itinerary and invoice.">
          <PrimaryLink href="/group-tours">Browse group tours</PrimaryLink>
          <OutlineLink href="/weekend-escapes">Weekend escapes</OutlineLink>
        </EmptyState>
      )}
      {!loading && items.length > 0 && (
        <>
          {filters.filter((f) => f.key !== "all" && counts[f.key] > 0).length > 1 && (
          <div role="tablist" aria-label="Filter bookings" className="mb-5 flex flex-wrap gap-2">
            {filters.filter((f) => f.key === "all" || counts[f.key] > 0).map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${filter === f.key ? "border-brand-red bg-brand-red text-white" : "border-black/15 bg-white hover:border-brand-red"}`}
              >
                {f.label} <span className="ml-1 text-xs opacity-80">{counts[f.key]}</span>
              </button>
            ))}
          </div>
          )}
          <ul className="space-y-4">
            {shown.map((b) => <li key={b.reference}><BookingCard b={b} /></li>)}
          </ul>
        </>
      )}
    </AccountLayout>
  );
}

export function BookingDetail({ reference }: { reference: string }) {
  const { data, loading, error } = useApi<{ data: Booking }>(`bookings/${reference}`);
  const [override, setOverride] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const b = override ?? data?.data ?? null;
  const balance = b ? Math.max(0, b.total_amount - b.paid_amount) : 0;
  const toGo = b ? daysUntil(b.departure.starts_on) : 0;

  return (
    <AccountLayout title="Booking" accent="details">
      <Link href="/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-red hover:underline"><ArrowLeft size={15} aria-hidden /> All bookings</Link>
      {loading && <ListSkeleton rows={2} />}
      {error && <EmptyState icon={CalendarX2} title="Booking not found" text="Check the reference, or open the booking from your list."><PrimaryLink href="/bookings">Back to my bookings</PrimaryLink></EmptyState>}
      {b && (
        <div className="space-y-6">
          <section className="rounded-3xl bg-gradient-to-br from-ink to-slate-800 p-6 text-white sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-widest text-amber-300">Reference {b.reference}</p>
                <h2 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">{b.tour.title}</h2>
              </div>
              <StatusBadge status={b.status} size="md" />
            </div>
            <dl className="mt-6 grid gap-5 sm:grid-cols-4">
              <div><dt className="flex items-center gap-1.5 text-xs text-white/65"><CalendarDays size={14} aria-hidden /> Departure</dt><dd className="mt-0.5 font-semibold">{formatDate(b.departure.starts_on)}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-xs text-white/65"><CalendarDays size={14} aria-hidden /> Return</dt><dd className="mt-0.5 font-semibold">{formatDate(b.departure.ends_on)}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-xs text-white/65"><Moon size={14} aria-hidden /> Duration</dt><dd className="mt-0.5 font-semibold">{b.tour.duration_nights + 1} days, {b.tour.duration_nights} nights</dd></div>
              <div><dt className="flex items-center gap-1.5 text-xs text-white/65"><Users size={14} aria-hidden /> Travellers</dt><dd className="mt-0.5 font-semibold">{b.traveller_count}{b.variant ? ` · ${b.variant}` : ""}</dd></div>
            </dl>
            {(b.status === "confirmed" || b.status === "pending_payment") && toGo >= 0 && (
              <p className="mt-5 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold">{toGo === 0 ? "Departs today" : `Departs in ${toGo} day${toGo === 1 ? "" : "s"}`}</p>
            )}
          </section>

          {b.status === "cancelled" && (
            <div className="rounded-2xl border border-black/10 bg-surface-alt p-5 text-sm">
              <p className="font-semibold">Cancelled{b.cancelled_at ? ` on ${formatDate(b.cancelled_at.slice(0, 10))}` : ""}</p>
              <p className="mt-1 text-muted">
                Cancellation charges {formatINR(b.cancellation_deduction ?? 0)}.{" "}
                {b.cancellation_outcome === "credit_note" && <>The remaining {formatINR(b.paid_amount - (b.cancellation_deduction ?? 0))} was issued as a <Link href="/account/credit-notes" className="text-brand-red underline">credit note</Link>.</>}
                {b.cancellation_outcome === "refund" && <>A refund of {formatINR(b.paid_amount - (b.cancellation_deduction ?? 0))} has been requested.</>}
                {b.cancellation_outcome === "none" && <>Nothing was returnable.</>}
              </p>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-6">
              <Card title="Payments" icon={Wallet}>
                {b.milestones.length === 0 ? <p className="text-sm text-muted">Fully paid with your credit note.</p> : <MilestoneList booking={b} onPaid={setOverride} />}
              </Card>

              <Card title="Travellers" icon={Users}>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {b.travellers.map((t, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-xl bg-surface-alt px-4 py-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-brand-red" aria-hidden>{(t.name[0] ?? "?").toUpperCase()}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{t.name}</span>
                        <span className="block text-xs text-muted">{[t.age ? `${t.age} years` : null, t.gender].filter(Boolean).join(" · ") || "Traveller"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <aside className="space-y-6">
              <Card title="Summary" icon={ReceiptText}>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted">Total (incl. GST)</dt><dd className="font-bold">{formatINR(b.total_amount)}</dd></div>
                  {b.credit_applied > 0 && <div className="flex justify-between text-green-700"><dt>Credit note applied</dt><dd className="font-semibold">− {formatINR(b.credit_applied)}</dd></div>}
                  <div className="flex justify-between"><dt className="text-muted">Paid</dt><dd className="font-bold text-green-700">{formatINR(b.paid_amount)}</dd></div>
                  <div className="flex justify-between border-t border-black/10 pt-2"><dt className="font-semibold">Balance</dt><dd className="text-base font-extrabold">{formatINR(balance)}</dd></div>
                </dl>
                <div className="mt-3"><PaidBar paid={b.paid_amount} total={b.total_amount} /></div>
              </Card>

              <Card title="Documents and actions" icon={FileText}>
                <div className="grid gap-2.5">
                  <Link href={`/bookings/${b.reference}/itinerary`} className="rounded-full bg-brand-red px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-red-dark">View itinerary</Link>
                  <Link href={`/bookings/${b.reference}/invoice`} className="rounded-full border border-brand-red px-5 py-2.5 text-center text-sm font-semibold text-brand-red hover:bg-brand-red/5">View invoice</Link>
                  <Link href={`/tours/${b.tour.slug}`} className="rounded-full border border-black/20 px-5 py-2.5 text-center text-sm font-semibold hover:border-brand-red hover:text-brand-red">Tour page</Link>
                  {(b.status === "confirmed" || b.status === "pending_payment") && (
                    <button onClick={() => setCancelling(true)} className="rounded-full px-5 py-2.5 text-sm font-semibold text-muted hover:text-brand-red">Cancel booking</button>
                  )}
                </div>
              </Card>

              <Card title="Need help?" icon={Headset}>
                <p className="text-sm text-muted">Questions about this trip? Our team can help.</p>
                <a href={site.phoneHref} className="mt-3 flex items-center gap-2 text-sm font-semibold hover:text-brand-red"><Phone size={15} className="text-brand-red" aria-hidden /> {site.phone}</a>
                <Link href="/account/support" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-red hover:underline">Raise a support ticket <ArrowRight size={14} aria-hidden /></Link>
              </Card>
            </aside>
          </div>

          {cancelling && (
            <CancelBookingDialog
              booking={b}
              onClose={() => setCancelling(false)}
              onCancelled={(nb) => {
                setOverride(nb);
                setCancelling(false);
              }}
            />
          )}
        </div>
      )}
    </AccountLayout>
  );
}
