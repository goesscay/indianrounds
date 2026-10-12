"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, SlidersHorizontal, X } from "lucide-react";
import { activeFilterCount, applyFilters, boundsOf, defaultFilters, parseFilters, serializeFilters, type DepartureTrip, type Filters, type SortKey } from "@/lib/departures";
import { formatDate, formatINR } from "@/lib/format";
import { CoverImage } from "../CoverImage";
import { OpenQuoteButton } from "../LeadModal";
import { RangeSlider } from "./RangeSlider";

const sorts: { key: SortKey; label: string }[] = [
  { key: "date", label: "Earliest departure" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
  { key: "nights_asc", label: "Shortest first" },
  { key: "nights_desc", label: "Longest first" },
];

const monthChip = (ym: string) => new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${ym}-01T00:00:00Z`));
const box = "rounded-card border border-black/10 bg-white p-4";
const chip = (on: boolean) => `rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${on ? "border-brand-red bg-brand-red text-white" : "border-black/15 hover:border-brand-red"}`;

/** The upcoming group trips page: filter panel, month strip and the matching trips. Filters live in the URL so a view can be shared. */
export function DeparturesExplorer({ trips }: { trips: DepartureTrip[] }) {
  const bounds = useMemo(() => boundsOf(trips), [trips]);
  const [f, setF] = useState<Filters>(() => defaultFilters(bounds));
  const [ready, setReady] = useState(false);
  const [panel, setPanel] = useState(false);

  // Pick up the filters in the address once the page has loaded (done after first paint so the server and browser render the same HTML).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setF(parseFilters(window.location.search, bounds));
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, [bounds]);

  useEffect(() => {
    if (!ready) return;
    const qs = serializeFilters(f, bounds);
    if (qs !== window.location.search) window.history.replaceState(null, "", `${window.location.pathname}${qs}`);
  }, [f, ready, bounds]);

  const set = (patch: Partial<Filters>) => setF((cur) => ({ ...cur, ...patch }));
  const results = useMemo(() => applyFilters(trips, f, bounds), [trips, f, bounds]);
  const active = activeFilterCount(f, bounds);
  const clear = () => setF(defaultFilters(bounds));

  // Destinations grouped by region, with how many trips each has (ignoring the destination filter itself so the counts stay useful).
  const places = useMemo(() => {
    const m = new Map<string, { name: string; slug: string; region: string; n: number }>();
    for (const t of trips) {
      const cur = m.get(t.destination.slug) ?? { ...t.destination, n: 0 };
      cur.n += 1;
      m.set(t.destination.slug, cur);
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [trips]);
  const visiblePlaces = places.filter((p) => f.region === "all" || p.region === f.region);

  const toggleDest = (slug: string) => set({ destinations: f.destinations.includes(slug) ? f.destinations.filter((s) => s !== slug) : [...f.destinations, slug] });

  const panelBody = (
    <div className="space-y-5">
      <div className={box}>
        <h3 className="font-bold">Where</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {([["all", "All"], ["india", "India"], ["international", "International"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => set({ region: k, destinations: [] })} aria-pressed={f.region === k} className={chip(f.region === k)}>{label}</button>
          ))}
        </div>
        <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1 text-sm">
          {visiblePlaces.map((p) => (
            <li key={p.slug}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-surface-alt">
                <input type="checkbox" checked={f.destinations.includes(p.slug)} onChange={() => toggleDest(p.slug)} className="size-4 accent-brand-red" />
                <span className="flex-1">{p.name}</span>
                <span className="text-xs text-muted">{p.n}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className={box}>
        <h3 className="font-bold">Trip type</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {([["all", "All trips"], ["group", "Group trips"], ["weekend", "Weekend getaways"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => set({ kind: k })} aria-pressed={f.kind === k} className={chip(f.kind === k)}>{label}</button>
          ))}
        </div>
      </div>

      <div className={`${box} space-y-6`}>
        <RangeSlider label="Duration" min={bounds.nights[0]} max={bounds.nights[1]} value={f.nights} onChange={(nights) => set({ nights })} format={(n) => `${n}N`} />
        <RangeSlider label="Budget per person" min={bounds.budget[0]} max={bounds.budget[1]} step={1000} value={f.budget} onChange={(budget) => set({ budget })} format={formatINR} />
      </div>

      <button type="button" onClick={clear} disabled={active === 0} className="w-full rounded-full border border-brand-red px-4 py-2.5 text-sm font-semibold text-brand-red transition hover:bg-brand-red hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-brand-red">
        Clear filters
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Filters: always visible on large screens, a slide-down panel on small ones. */}
        <aside aria-label="Filters" className="lg:sticky lg:top-[120px] lg:self-start">
          <button type="button" onClick={() => setPanel(!panel)} aria-expanded={panel} className="flex w-full items-center justify-between rounded-full border border-black/15 bg-white px-5 py-3 font-semibold lg:hidden">
            <span className="flex items-center gap-2"><SlidersHorizontal size={18} aria-hidden /> Filters{active > 0 ? ` (${active})` : ""}</span>
            {panel ? <X size={18} aria-hidden /> : <ChevronRight size={18} aria-hidden />}
          </button>
          <div className={`${panel ? "mt-4 block" : "hidden"} lg:mt-0 lg:block`}>{panelBody}</div>
        </aside>

        <div className="min-w-0">
          <MonthStrip months={bounds.months} value={f.month} onChange={(month) => set({ month })} />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-extrabold">
              {f.month ? `Trips in ${monthChip(f.month)}` : "All upcoming trips"} <span className="ml-1 text-base font-semibold text-muted">({results.length})</span>
            </h2>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Sort by</span>
              <select value={f.sort} onChange={(e) => set({ sort: e.target.value as SortKey })} className="rounded-full border border-black/15 bg-white px-3 py-2 font-medium">
                {sorts.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
          </div>

          {results.length > 0 ? (
            <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((t) => <TripCard key={t.slug} trip={t} />)}
            </ul>
          ) : (
            <div className="mt-6 rounded-card bg-surface-alt p-8 text-center">
              <p className="text-lg font-bold">No trips match these filters</p>
              <p className="mt-1 text-sm text-muted">Try a wider budget or another month, or tell us what you have in mind and we will plan it.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={clear} className="rounded-full border border-brand-red px-6 py-2.5 font-semibold text-brand-red hover:bg-brand-red hover:text-white">Clear filters</button>
                <OpenQuoteButton className="rounded-full bg-brand-red px-6 py-2.5 font-semibold text-white hover:bg-brand-red-dark">Get a Free Quote</OpenQuoteButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthStrip({ months, value, onChange }: { months: string[]; value: string | null; onChange: (m: string | null) => void }) {
  const scroll = (dir: 1 | -1) => document.getElementById("month-strip")?.scrollBy({ left: dir * 320, behavior: "smooth" });
  if (months.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => scroll(-1)} aria-label="Earlier months" className="hidden size-9 shrink-0 place-items-center rounded-full border border-black/15 bg-white hover:border-brand-red hover:text-brand-red sm:grid"><ChevronLeft size={18} /></button>
      <ul id="month-strip" aria-label="Departure month" className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
        <li><button type="button" onClick={() => onChange(null)} aria-pressed={value === null} className={`${chip(value === null)} whitespace-nowrap`}>All months</button></li>
        {months.map((m) => (
          <li key={m}><button type="button" onClick={() => onChange(value === m ? null : m)} aria-pressed={value === m} className={`${chip(value === m)} whitespace-nowrap`}>{monthChip(m)}</button></li>
        ))}
      </ul>
      <button type="button" onClick={() => scroll(1)} aria-label="Later months" className="hidden size-9 shrink-0 place-items-center rounded-full border border-black/15 bg-white hover:border-brand-red hover:text-brand-red sm:grid"><ChevronRight size={18} /></button>
    </div>
  );
}

function TripCard({ trip: t }: { trip: DepartureTrip & { shown: DepartureTrip["departures"] } }) {
  const dates = t.shown.slice(0, 3);
  // With no month chosen, the count covers every open departure; with one, only the dates in that month.
  const more = (t.shown.length === t.departures.length ? t.departure_count : t.shown.length) - dates.length;
  const low = t.shown.find((d) => d.seats_left <= 4);
  return (
    <li>
      <Link href={`/tours/${t.slug}`} className="group flex h-full flex-col overflow-hidden rounded-card bg-white shadow-float transition hover:-translate-y-1">
        <div className="relative">
          <CoverImage src={t.image_url} alt={t.title} seed={t.slug} sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 100vw" className="aspect-[4/3] transition duration-500 group-hover:scale-105" />
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
