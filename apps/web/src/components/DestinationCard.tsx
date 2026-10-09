import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Destination } from "@/lib/api";
import { CoverImage } from "./CoverImage";

export function DestinationCard({ destination, href, note }: { destination: Destination; href?: string; note?: string }) {
  const line = note ?? (destination.best_time ? `On season: ${destination.best_time}` : null);

  return (
    <Link href={href ?? `/destinations/${destination.slug}`} className="group relative block aspect-[3/4] overflow-hidden rounded-card shadow-float">
      <CoverImage src={destination.image_url} alt={destination.name} seed={destination.slug} className="absolute inset-0 transition duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 text-white">
        <div>
          <h3 className="text-xl font-bold">{destination.name}</h3>
          {destination.tagline && <p className="line-clamp-3 text-[11px] leading-snug text-white/85">{destination.tagline}</p>}
          {line && <p className="mt-1 text-[11px] font-semibold text-white">{line}</p>}
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/70">
          <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}
