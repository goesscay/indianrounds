"use client";

import Link from "next/link";
import type { Booking, Tour } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format";
import { site } from "@/lib/site";
import { useApi } from "@/lib/use-api";
import { RequireAuth } from "./RequireAuth";

export function ItineraryView({ reference }: { reference: string }) {
  return (
    <RequireAuth>
      <Inner reference={reference} />
    </RequireAuth>
  );
}

function Inner({ reference }: { reference: string }) {
  const booking = useApi<{ data: Booking }>(`bookings/${reference}`);
  const b = booking.data?.data;
  const tour = useApi<{ data: Tour }>(b ? `tours/${b.tour.slug}` : null);
  const t = tour.data?.data;

  if (booking.error) return <p className="p-16 text-center text-muted">Booking not found.</p>;
  if (!b || !t) return <p className="p-16 text-center text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/bookings/${b.reference}`} className="text-sm font-semibold text-brand-red">← Back to booking</Link>
        <button onClick={() => window.print()} className="rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark">Print / Save as PDF</button>
      </div>

      <article className="space-y-8">
        <header className="border-b border-black/10 pb-4">
          <p className="text-xs uppercase tracking-widest text-brand-red">Indian Rounds · Travel Beyond Borders</p>
          <h1 className="mt-1 text-3xl font-extrabold">{t.title}</h1>
          <p className="text-sm text-muted">
            Booking {b.reference} · {formatDate(b.departure.starts_on)} – {formatDate(b.departure.ends_on)} · {b.traveller_count} traveller{b.traveller_count === 1 ? "" : "s"}
          </p>
          <p className="text-sm text-muted">Pickup: {t.pickup ?? "—"} · Drop: {t.drop_point ?? "—"}</p>
        </header>

        <section>
          <h2 className="mb-3 text-xl font-extrabold">Day-by-day</h2>
          <ol className="space-y-4">
            {(t.itinerary ?? []).map((d) => (
              <li key={d.day} className="break-inside-avoid">
                <p className="font-bold">Day {d.day}: {d.title}</p>
                <p className="text-sm text-muted">{d.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 font-extrabold">Included</h2>
            <ul className="list-inside list-disc text-sm text-muted">{(t.inclusions ?? []).map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div>
            <h2 className="mb-2 font-extrabold">Please carry</h2>
            <ul className="list-inside list-disc text-sm text-muted">{(t.must_carry ?? []).map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-extrabold">Travellers</h2>
          <ul className="list-inside list-disc text-sm text-muted">{b.travellers.map((x, i) => <li key={i}>{x.name}</li>)}</ul>
        </section>

        <section>
          <h2 className="mb-2 font-extrabold">Payment summary</h2>
          <p className="text-sm text-muted">Total {formatINR(b.total_amount)} · paid {formatINR(b.paid_amount)}</p>
          <ul className="mt-2 text-sm text-muted">
            {b.milestones.map((m) => (
              <li key={m.id}>{m.label}: {formatINR(m.amount)} — {m.status === "paid" ? "paid" : `due ${formatDate(m.due_on)}`}</li>
            ))}
          </ul>
        </section>

        <footer className="border-t border-black/10 pt-4 text-xs text-muted">
          Itineraries may change for weather, road or safety reasons. Emergency contact: {site.phone} · {site.email}
        </footer>
      </article>
    </div>
  );
}
