import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { DepartureTrip } from "@/lib/departures";
import { formatDate, formatINR } from "@/lib/format";
import { CoverImage } from "../CoverImage";

/** One upcoming trip: photo, length, route, the next departure dates and the price. `priceChip` also floats the price over the photo. */
export function TripCard({ trip: t, priceChip = false, className }: { trip: DepartureTrip & { shown: DepartureTrip["departures"] }; priceChip?: boolean; className?: string }) {
  const dates = t.shown.slice(0, 3);
  // With no month chosen, the count covers every open departure; with one, only the dates in that month.
  const more = (t.shown.length === t.departures.length ? t.departure_count : t.shown.length) - dates.length;
  const low = t.shown.find((d) => d.seats_left <= 4);
  return (
    <li className={className}>
      <Link href={`/tours/${t.slug}`} className="group flex h-full flex-col overflow-hidden rounded-card bg-white shadow-float transition hover:-translate-y-1">
        <div className="relative">
          <CoverImage src={t.image_url} alt={t.title} seed={t.slug} sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 100vw" className="aspect-[4/3] transition duration-500 group-hover:scale-105" />
          {priceChip && t.price !== null && <span className="absolute right-3 top-3 rounded-full bg-amber-300 px-3 py-1 text-xs font-extrabold text-ink shadow">{formatINR(t.price)} onwards</span>}
          <span className="absolute left-3 top-3 rounded-full bg-brand-red px-3 py-1 text-xs font-bold text-white shadow">{t.kind === "weekend" ? "Weekend Escape" : "Group Trip"}</span>
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{t.destination.name}</span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-2 font-bold leading-snug group-hover:text-brand-red">{t.title}</h3>
          <p className="text-sm font-semibold">{t.duration_nights}N / {t.duration_days}D</p>
          {(t.pickup || t.drop_point) && (
            <p className="flex items-start gap-1.5 text-xs text-muted">
              <MapPin size={14} className="mt-0.5 shrink-0 text-brand-red" aria-hidden />
              <span className="line-clamp-2">{t.pickup === t.drop_point || !t.drop_point ? t.pickup : `${t.pickup} to ${t.drop_point}`}</span>
            </p>
          )}
          <p className="flex flex-wrap items-center gap-1.5 text-xs">
            <CalendarDays size={14} className="text-brand-red" aria-hidden />
            {dates.map((d) => <span key={d.starts_on} className="rounded bg-surface-alt px-2 py-0.5 font-semibold">{formatDate(d.starts_on, { day: "numeric", month: "short" })}</span>)}
            {more > 0 && <span className="text-muted">+{more} more</span>}
          </p>
          {low && <p className="text-xs font-semibold text-brand-red">Only {low.seats_left} seat{low.seats_left === 1 ? "" : "s"} left on {formatDate(low.starts_on, { day: "numeric", month: "short" })}</p>}
          <div className="mt-auto flex items-end justify-between pt-3">
            {t.price !== null ? (
              <div>
                {t.original_price && <p className="text-xs text-muted line-through">{formatINR(t.original_price)}</p>}
                <p className="text-xl font-extrabold text-brand-red">{formatINR(t.price)} <span className="text-xs font-medium text-muted">onwards</span></p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-brand-red">Get a free quote</p>
            )}
            <span className="text-sm font-semibold text-brand-red">View dates →</span>
          </div>
        </div>
      </Link>
    </li>
  );
}
