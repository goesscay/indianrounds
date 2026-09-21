"use client";

import Link from "next/link";
import { useState } from "react";
import type { Booking } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { AccountLayout } from "./AccountNav";
import { CancelBookingDialog } from "./CancelBookingDialog";
import { MilestoneList } from "./MilestoneList";

const statusStyle: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  pending_payment: "bg-amber-100 text-amber-800",
  expired: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-100 text-gray-600",
};
const statusLabel: Record<string, string> = { confirmed: "Confirmed", pending_payment: "Awaiting payment", expired: "Expired", cancelled: "Cancelled" };

export function BookingsList() {
  const { data, loading } = useApi<{ data: Booking[] }>("bookings");
  const items = data?.data ?? [];

  return (
    <AccountLayout title="My" accent="bookings">
      {loading && <p className="text-muted">Loading…</p>}
      {!loading && items.length === 0 && (
        <div className="rounded-card bg-surface-alt p-8 text-center">
          <p className="font-semibold">No bookings yet.</p>
          <Link href="/tours" className="mt-2 inline-block text-brand-red underline">Browse tours</Link>
        </div>
      )}
      <ul className="space-y-4">
        {items.map((b) => (
          <li key={b.reference}>
            <Link href={`/bookings/${b.reference}`} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-black/10 p-5 hover:border-brand-red">
              <div>
                <p className="font-bold">{b.tour.title}</p>
                <p className="text-sm text-muted">{b.reference} · Departs {formatDate(b.departure.starts_on)} · {b.traveller_count} traveller{b.traveller_count === 1 ? "" : "s"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">{formatINR(b.total_amount)}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[b.status]}`}>{statusLabel[b.status]}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </AccountLayout>
  );
}

export function BookingDetail({ reference }: { reference: string }) {
  const { data, loading, error } = useApi<{ data: Booking }>(`bookings/${reference}`);
  const [override, setOverride] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const b = override ?? data?.data ?? null;

  return (
    <AccountLayout title="Booking" accent="details">
      {loading && <p className="text-muted">Loading…</p>}
      {error && <p className="text-muted">Booking not found.</p>}
      {b && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href="/bookings" className="text-sm font-semibold text-brand-red">← All bookings</Link>
              <h2 className="mt-1 text-2xl font-extrabold">{b.tour.title}</h2>
              <p className="text-muted">Reference {b.reference}</p>
            </div>
            <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${statusStyle[b.status]}`}>{statusLabel[b.status]}</span>
          </div>

          {b.status === "cancelled" && (
            <div className="rounded-card border border-black/10 bg-surface-alt p-5 text-sm">
              <p className="font-semibold">Cancelled{b.cancelled_at ? ` on ${formatDate(b.cancelled_at.slice(0, 10))}` : ""}</p>
              <p className="text-muted">
                Cancellation charges {formatINR(b.cancellation_deduction ?? 0)}.{" "}
                {b.cancellation_outcome === "credit_note" && <>The remaining {formatINR(b.paid_amount - (b.cancellation_deduction ?? 0))} was issued as a <Link href="/account/credit-notes" className="text-brand-red underline">credit note</Link>.</>}
                {b.cancellation_outcome === "refund" && <>A refund of {formatINR(b.paid_amount - (b.cancellation_deduction ?? 0))} has been requested.</>}
                {b.cancellation_outcome === "none" && <>Nothing was returnable.</>}
              </p>
            </div>
          )}

          <dl className="grid gap-4 rounded-card bg-surface-alt p-5 text-sm sm:grid-cols-3">
            <div><dt className="text-muted">Departure</dt><dd className="font-semibold">{formatDate(b.departure.starts_on)} – {formatDate(b.departure.ends_on)}</dd></div>
            <div><dt className="text-muted">Travellers</dt><dd className="font-semibold">{b.traveller_count}{b.variant ? ` · ${b.variant}` : ""}</dd></div>
            <div><dt className="text-muted">Total (incl. GST)</dt><dd className="font-semibold">{formatINR(b.total_amount)} · paid {formatINR(b.paid_amount)}</dd></div>
          </dl>
          {b.credit_applied > 0 && <p className="-mt-4 text-sm text-green-700">Includes {formatINR(b.credit_applied)} paid with a credit note.</p>}

          <section>
            <h3 className="mb-3 text-xl font-extrabold">Payments</h3>
            {b.milestones.length === 0 ? <p className="text-sm text-muted">Fully paid with your credit note.</p> : <MilestoneList booking={b} onPaid={setOverride} />}
          </section>

          <section>
            <h3 className="mb-3 text-xl font-extrabold">Travellers</h3>
            <ul className="list-inside list-disc text-sm text-muted">
              {b.travellers.map((t, i) => (
                <li key={i}>{t.name}{t.age ? `, ${t.age}` : ""}</li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link href={`/bookings/${b.reference}/itinerary`} className="rounded-full bg-brand-red px-6 py-2.5 font-semibold text-white hover:bg-brand-red-dark">Itinerary</Link>
            <Link href={`/bookings/${b.reference}/invoice`} className="rounded-full border border-brand-red px-6 py-2.5 font-semibold text-brand-red">Invoice</Link>
            <Link href={`/tours/${b.tour.slug}`} className="rounded-full border border-black/20 px-6 py-2.5 font-semibold">Tour page</Link>
            <Link href={`/account/support`} className="rounded-full border border-black/20 px-6 py-2.5 font-semibold">Get help</Link>
            {(b.status === "confirmed" || b.status === "pending_payment") && (
              <button onClick={() => setCancelling(true)} className="rounded-full border border-black/20 px-6 py-2.5 font-semibold text-muted hover:border-brand-red hover:text-brand-red">Cancel booking</button>
            )}
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
