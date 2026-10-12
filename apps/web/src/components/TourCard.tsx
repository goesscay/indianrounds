import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Tour } from "@/lib/api";
import { durationLabel, formatDate, formatINR } from "@/lib/format";
import { hasFixedDepartures } from "@/lib/tour-kind";
import { CoverImage } from "./CoverImage";

export function TourCard({ tour }: { tour: Tour }) {
  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group flex flex-col overflow-hidden rounded-card bg-white shadow-float transition hover:-translate-y-1"
    >
      <div className="relative">
        <CoverImage src={tour.image_url} alt={tour.title} seed={tour.slug} className="aspect-[4/3]" />
        {hasFixedDepartures(tour) && <span className="absolute left-3 top-3 rounded-full bg-brand-red px-3 py-1 text-xs font-bold text-white shadow">Group Trip</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {tour.destination && <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">{tour.destination.name}</p>}
        <h3 className="font-bold leading-snug">{tour.title}</h3>
        <p className="text-sm text-muted">{durationLabel(tour.duration_nights, tour.duration_days)}</p>
        {tour.price !== null && hasFixedDepartures(tour) &&
          (tour.next_batch ? (
            <p className="text-xs text-muted">Next departure: {formatDate(tour.next_batch.starts_on)}</p>
          ) : (
            <p className="text-xs text-muted">No upcoming departures</p>
          ))}
        <div className="mt-auto flex items-end justify-between pt-3">
          {tour.price !== null ? (
            <div>
              {hasFixedDepartures(tour) && tour.original_price && <p className="text-xs text-muted line-through">{formatINR(tour.original_price)}</p>}
              {!hasFixedDepartures(tour) && <p className="text-xs text-muted">Starting from</p>}
              <p className="text-xl font-extrabold text-brand-red">{formatINR(tour.price)}</p>
              <p className="text-xs text-muted">per person</p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-brand-red">Get a free quote</p>
          )}
          <span className="grid size-9 place-items-center rounded-full bg-brand-red text-white transition group-hover:bg-brand-red-dark">
            <ArrowRight size={18} />
          </span>
        </div>
      </div>
    </Link>
  );
}
