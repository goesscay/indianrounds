"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FocusEvent } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { Destination } from "@/lib/api";
import { CoverImage } from "./CoverImage";

/** Order requested for the mega menu; anything else stays reachable only from "View all". */
const featured = ["Europe", "Vietnam", "Bali", "Thailand", "Japan", "Georgia", "Sri Lanka", "Bhutan", "Philippines", "Singapore", "New Zealand", "Spain", "Malaysia"];

export function DestinationsMegaMenu({ destinations }: { destinations: Destination[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  // A client-side route change leaves the cursor exactly where it was, so plain CSS :hover
  // would keep the panel open over the destination page that just loaded. Closing on every
  // navigation (and explicitly on click, so it doesn't wait for the route to finish) fixes that.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  const byName = new Map(destinations.map((d) => [d.name, d]));
  const items = featured.map((name) => byName.get(name)).filter((d): d is Destination => Boolean(d));

  function closeOnBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
  }

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={closeOnBlur}>
      <Link href="/destinations" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(false)} className="flex items-center gap-1 text-sm font-semibold text-white/90 transition hover:text-white">
        Destinations <ChevronDown size={14} />
      </Link>
      <div className={`absolute left-0 top-full z-50 w-[52rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-black/5 bg-white p-5 shadow-float transition ${open ? "visible opacity-100" : "invisible opacity-0"}`}>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {items.map((d) => (
            <li key={d.slug}>
              <Link href={`/destinations/${d.slug}`} onClick={() => setOpen(false)} className="group/card flex flex-col overflow-hidden rounded-lg">
                <CoverImage src={d.image_url} alt={d.name} seed={d.slug} className="aspect-[4/3] transition duration-300 group-hover/card:scale-105" />
                <span className="mt-2 text-sm font-semibold text-ink group-hover/card:text-brand-red">{d.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/destinations" onClick={() => setOpen(false)} className="mt-4 flex items-center justify-center gap-2 rounded-full border border-brand-red py-2.5 text-sm font-semibold text-brand-red transition hover:bg-brand-red hover:text-white">
          View All Destinations <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
