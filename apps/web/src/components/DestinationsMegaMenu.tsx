import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { Destination } from "@/lib/api";
import { CoverImage } from "./CoverImage";

/** Order requested for the mega menu; anything else stays reachable only from "View all". */
const featured = ["Europe", "Vietnam", "Bali", "Thailand", "Japan", "Georgia", "Sri Lanka", "Bhutan", "Philippines", "Singapore", "New Zealand", "Spain", "Malaysia"];

export function DestinationsMegaMenu({ destinations }: { destinations: Destination[] }) {
  const byName = new Map(destinations.map((d) => [d.name, d]));
  const items = featured.map((name) => byName.get(name)).filter((d): d is Destination => Boolean(d));

  return (
    <div className="group relative">
      <Link href="/destinations" aria-haspopup="true" className="flex items-center gap-1 text-sm font-semibold text-white/90 transition hover:text-white">
        Destinations <ChevronDown size={14} />
      </Link>
      <div className="invisible absolute left-0 top-full z-50 w-[52rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-black/5 bg-white p-5 opacity-0 shadow-float transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {items.map((d) => (
            <li key={d.slug}>
              <Link href={`/destinations/${d.slug}`} className="group/card flex flex-col overflow-hidden rounded-lg">
                <CoverImage src={d.image_url} alt={d.name} seed={d.slug} className="aspect-[4/3] transition duration-300 group-hover/card:scale-105" />
                <span className="mt-2 text-sm font-semibold text-ink group-hover/card:text-brand-red">{d.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/destinations" className="mt-4 flex items-center justify-center gap-2 rounded-full border border-brand-red py-2.5 text-sm font-semibold text-brand-red transition hover:bg-brand-red hover:text-white">
          View All Destinations <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
