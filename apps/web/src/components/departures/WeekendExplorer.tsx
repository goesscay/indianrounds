"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { activeFilterCount, applyFilters, boundsOf, defaultFilters, parseFilters, serializeFilters, type DepartureTrip, type Filters, type SortKey } from "@/lib/departures";
import { formatINR } from "@/lib/format";
import { OpenQuoteButton } from "../LeadModal";
import { Rail } from "../home/Rail";
import { RangeSlider } from "./RangeSlider";
import { TripCard } from "./TripCard";

const sorts: { key: SortKey; label: string }[] = [
  { key: "date", label: "Earliest departure" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
  { key: "nights_asc", label: "Shortest first" },
  { key: "nights_desc", label: "Longest first" },
];

type Pill = "where" | "budget" | "duration" | "sort" | null;

/** One pill in the filter bar that opens a small panel; closes on an outside click or Escape. */
function FilterPill({ id, label, open, setOpen, active, children }: { id: Exclude<Pill, null>; label: string; open: Pill; setOpen: (p: Pill) => void; active: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const isOpen = open === id;

  useEffect(() => {
    if (!isOpen) return;
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [isOpen, setOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(isOpen ? null : id)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? "border-brand-red bg-brand-red/10 text-brand-red" : "border-black/15 bg-white hover:border-brand-red"}`}
      >
        {label} <ChevronDown size={14} aria-hidden className={isOpen ? "rotate-180" : ""} />
      </button>
      {isOpen && (
        <div role="dialog" aria-label={label} className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-card border border-black/10 bg-white p-4 shadow-float">
          {children}
        </div>
      )}
    </div>
  );
}

const chip = (on: boolean) => `rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${on ? "border-brand-red bg-brand-red text-white" : "border-black/15 hover:border-brand-red"}`;

/** The weekend getaways page: filter pills, then the matching trips in rows, one row for India and one for abroad. */
export function WeekendExplorer({ trips }: { trips: DepartureTrip[] }) {
  const bounds = useMemo(() => boundsOf(trips), [trips]);
  const [f, setF] = useState<Filters>(() => defaultFilters(bounds));
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<Pill>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setF({ ...parseFilters(window.location.search, bounds), month: null });
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
  const active = activeFilterCount({ ...f, month: null }, bounds);
  const reset = () => setF(defaultFilters(bounds));

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

  const india = results.filter((t) => t.destination.region === "india");
  const abroad = results.filter((t) => t.destination.region !== "india");
  const nightsOn = f.nights[0] > bounds.nights[0] || f.nights[1] < bounds.nights[1];
  const budgetOn = f.budget[0] > bounds.budget[0] || f.budget[1] < bounds.budget[1];

  return (
    <div>
      <div className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-4 sm:px-6 lg:px-8">
          <FilterPill id="where" label={f.destinations.length ? `Where (${f.destinations.length})` : f.region === "all" ? "Where" : f.region === "india" ? "Where: India" : "Where: Abroad"} open={open} setOpen={setOpen} active={f.region !== "all" || f.destinations.length > 0}>
            <div className="flex flex-wrap gap-2">
              {([["all", "All"], ["india", "India"], ["international", "Abroad"]] as const).map(([k, label]) => (
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
          </FilterPill>
          <FilterPill id="budget" label="Budget" open={open} setOpen={setOpen} active={budgetOn}>
            <RangeSlider label="Per person" min={bounds.budget[0]} max={bounds.budget[1]} step={1000} value={f.budget} onChange={(budget) => set({ budget })} format={formatINR} />
          </FilterPill>
          <FilterPill id="duration" label="Duration" open={open} setOpen={setOpen} active={nightsOn}>
            <RangeSlider label="Nights" min={bounds.nights[0]} max={bounds.nights[1]} value={f.nights} onChange={(nights) => set({ nights })} format={(n) => `${n}N`} />
          </FilterPill>
          <FilterPill id="sort" label="Sort" open={open} setOpen={setOpen} active={f.sort !== "date"}>
            <fieldset>
              <legend className="sr-only">Sort trips by</legend>
              <ul className="space-y-1 text-sm">
                {sorts.map((s) => (
                  <li key={s.key}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-surface-alt">
                      <input type="radio" name="weekend-sort" checked={f.sort === s.key} onChange={() => { set({ sort: s.key }); setOpen(null); }} className="accent-brand-red" />
                      {s.label}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          </FilterPill>
          <button type="button" onClick={reset} disabled={active === 0 && f.sort === "date"} className="flex items-center gap-1.5 rounded-full border border-black/15 bg-surface-alt px-4 py-2 text-sm font-semibold transition hover:border-brand-red disabled:cursor-not-allowed disabled:opacity-50">
            <RotateCcw size={14} aria-hidden /> Reset
          </button>
          <p className="ml-auto text-sm text-muted" aria-live="polite">{results.length} trip{results.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 lg:px-8">
        {india.length > 0 && <Row title="Weekend Getaways" accent="in India" sub="Short breaks you can reach by a Friday train or flight" trips={india} />}
        {abroad.length > 0 && <Row title="Weekend Getaways" accent="Abroad" sub="Three nights overseas, fly Friday and be back for Monday" trips={abroad} />}
        {results.length === 0 && (
          <div className="rounded-card bg-surface-alt p-8 text-center">
            <p className="text-lg font-bold">No weekend trips match these filters</p>
            <p className="mt-1 text-sm text-muted">Try a wider budget or duration, or tell us where you would like to go this weekend.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={reset} className="rounded-full border border-brand-red px-6 py-2.5 font-semibold text-brand-red hover:bg-brand-red hover:text-white">Reset filters</button>
              <OpenQuoteButton className="rounded-full bg-brand-red px-6 py-2.5 font-semibold text-white hover:bg-brand-red-dark">Get a Free Quote</OpenQuoteButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ title, accent, sub, trips }: { title: string; accent: string; sub: string; trips: ReturnType<typeof applyFilters> }) {
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-2xl font-extrabold sm:text-3xl">{title} <span className="text-brand-red">{accent}</span></h2>
        <p className="mt-1 text-sm text-muted">{sub} · {trips.length} trip{trips.length === 1 ? "" : "s"}</p>
      </div>
      <Rail label={`${title} ${accent}`}>
        {trips.map((t) => (
          <TripCard key={t.slug} trip={t} priceChip className="w-72 shrink-0 snap-start" />
        ))}
      </Rail>
    </section>
  );
}
