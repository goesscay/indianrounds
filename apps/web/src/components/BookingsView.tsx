"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Booking } from "@/lib/api";
import { apiFetch } from "@/lib/client-api";
import { formatDate, formatINR } from "@/lib/format";
import { MilestoneList } from "./MilestoneList";
import { RequireAuth } from "./RequireAuth";

const statusStyle: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  pending_payment: "bg-amber-100 text-amber-800",
  expired: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-100 text-gray-600",
};
const statusLabel: Record<string, string> = { confirmed: "Confirmed", pending_payment: "Awaiting payment", expired: "Expired", cancelled: "Cancelled" };

export function BookingsList() {
  return (
    <RequireAuth>
      <ListInner />
    </RequireAuth>
  );
}

function ListInner() {
  const [items, setItems] = useState<Booking[] | null>(null);

  useEffect(() => {
    apiFetch<{ data: Booking[] }>("bookings").then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold sm:text-4xl">My <span className="text-brand-red">bookings</span></h1>
      {items === null && <p className="mt-6 text-muted">Loading…</p>}
      {items?.length === 0 && (
        <div className="mt-6 rounded-card bg-surface-alt p-8 text-center">
          <p className="font-semibold">No bookings yet.</p>
          <Link href="/tours" className="mt-2 inline-block text-brand-red underline">Browse tours</Link>
        </div>
      )}
      <ul className="mt-6 space-y-4">
        {items?.map((b) => (
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
    </div>
  );
}

export function BookingDetail({ reference }: { reference: string }) {
  return (
    <RequireAuth>
      <DetailInner reference={reference} />
    </RequireAuth>
  );
}

function DetailInner({ reference }: { reference: string }) {
  const [b, setB] = useState<Booking | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    apiFetch<{ data: Booking }>(`bookings/${reference}`).then((r) => setB(r.data)).catch(() => setMissing(true));
  }, [reference]);

  if (missing) return <p className="p-16 text-center text-muted">Booking not found.</p>;
  if (!b) return <p className="p-16 text-center text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/bookings" className="text-sm font-semibold text-brand-red">← All bookings</Link>
          <h1 className="mt-1 text-3xl font-extrabold">{b.tour.title}</h1>
          <p className="text-muted">Reference {b.reference}</p>
        </div>
        <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${statusStyle[b.status]}`}>{statusLabel[b.status]}</span>
      </div>

      <dl className="grid gap-4 rounded-card bg-surface-alt p-5 text-sm sm:grid-cols-3">
        <div><dt className="text-muted">Departure</dt><dd className="font-semibold">{formatDate(b.departure.starts_on)} – {formatDate(b.departure.ends_on)}</dd></div>
        <div><dt className="text-muted">Travellers</dt><dd className="font-semibold">{b.traveller_count}{b.variant ? ` · ${b.variant}` : ""}</dd></div>
        <div><dt className="text-muted">Total (incl. GST)</dt><dd className="font-semibold">{formatINR(b.total_amount)} · paid {formatINR(b.paid_amount)}</dd></div>
      </dl>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">Payments</h2>
        <MilestoneList booking={b} onPaid={setB} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">Travellers</h2>
        <ul className="list-inside list-disc text-sm text-muted">
          {b.travellers.map((t, i) => (
            <li key={i}>{t.name}{t.age ? `, ${t.age}` : ""}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href={`/bookings/${b.reference}/invoice`} className="rounded-full border border-brand-red px-6 py-2.5 font-semibold text-brand-red">View invoice</Link>
        <Link href={`/tours/${b.tour.slug}`} className="rounded-full border border-black/20 px-6 py-2.5 font-semibold">Tour details</Link>
      </div>
    </div>
  );
}
