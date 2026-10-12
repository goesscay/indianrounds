"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BadgePercent, ChevronDown, RotateCcw } from "lucide-react";
import type { Tour } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { RangeSlider } from "../departures/RangeSlider";
import { OpenQuoteButton } from "../LeadModal";
import { TourCard } from "../TourCard";

type Kind = "group" | "weekend" | "honeymoon" | "private";
type SortKey = "saving" | "price_asc" | "price_desc" | "nights_asc";
type Pill = "where" | "type" | "budget" | "sort" | null;
type Offer = Tour & { price: number; original_price: number };

const kindOf = (t: Tour): Kind => ((t.tags ?? []).includes("weekend") ? "weekend" : t.tour_type === "group" ? "group" : (t.tags ?? []).includes("couples") ? "honeymoon" : "private");
const kindLabel: Record<Kind, string> = { group: "Group trips", weekend: "Weekend getaways", honeymoon: "Honeymoon", private: "Private packages" };
const saving = (t: Offer) => (t.original_price - t.price) / t.original_price;
const sorts: { key: SortKey; label: string }[] = [
  { key: "saving", label: "Biggest saving" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
  { key: "nights_asc", label: "Shortest first" },
];
const chip = (on: boolean) => `rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${on ? "border-brand-red bg-brand-red text-white" : "border-black/15 hover:border-brand-red"}`;

function FilterPill({ id, label, open, setOpen, active, children }: { id: Exclude<Pill, null>; label: string; open: Pill; setOpen: (p: Pill) => void; active: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const isOpen = open === id;
  useEffect(() => {
    if (!isOpen) return;
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(null);
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
      <button type="button" onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen} aria-haspopup="dialog" className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? "border-brand-red bg-brand-red/10 text-brand-red" : "border-black/15 bg-white hover:border-brand-red"}`}>
        {label} <ChevronDown size={14} aria-hidden className={isOpen ? "rotate-180" : ""} />
      </button>
      {isOpen && <div role="dialog" aria-label={label} className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-card border border-black/10 bg-white p-4 shadow-float">{children}</div>}
    </div>
  );
}

/** Discounted packages with filter pills: where, type of trip, budget and sort. */
export function OffersExplorer({ offers }: { offers: Offer[] }) {
  const prices = offers.map((t) => t.price);
  const lo = Math.floor(Math.min(...prices, Infinity) / 1000) * 1000;
  const hi = Math.ceil(Math.max(...prices, 0) / 1000) * 1000;
  const [region, setRegion] = useState<"all" | "india" | "international">("all");
  const [kinds, setKinds] = useState<Kind[]>([]);
  const [budget, setBudget] = useState<[number, number]>([lo, hi]);
  const [sort, setSort] = useState<SortKey>("saving");
  const [open, setOpen] = useState<Pill>(null);

  const budgetOn = budget[0] > lo || budget[1] < hi;
  const active = (region !== "all" ? 1 : 0) + (kinds.length ? 1 : 0) + (budgetOn ? 1 : 0);
  const reset = () => {
    setRegion("all");
    setKinds([]);
    setBudget([lo, hi]);
    setSort("saving");
  };
  const present = useMemo(() => [...new Set(offers.map(kindOf))], [offers]);

  const shown = useMemo(() => {
    const by: Record<SortKey, (a: Offer, b: Offer) => number> = {
      saving: (a, b) => saving(b) - saving(a),
      price_asc: (a, b) => a.price - b.price,
      price_desc: (a, b) => b.price - a.price,
      nights_asc: (a, b) => a.duration_nights - b.duration_nights,
    };
    return offers
      .filter((t) => region === "all" || (region === "india" ? t.destination?.region === "india" : t.destination?.region !== "india"))
      .filter((t) => !kinds.length || kinds.includes(kindOf(t)))
      .filter((t) => t.price >= budget[0] && t.price <= budget[1])
      .sort(by[sort]);
  }, [offers, region, kinds, budget, sort]);

  return (
    <div>
      <div className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-4 sm:px-6 lg:px-8">
          <FilterPill id="where" label={region === "all" ? "Where" : region === "india" ? "Where: India" : "Where: Abroad"} open={open} setOpen={setOpen} active={region !== "all"}>
            <div className="flex flex-wrap gap-2">
              {([["all", "All"], ["india", "India"], ["international", "Abroad"]] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => { setRegion(k); setOpen(null); }} aria-pressed={region === k} className={chip(region === k)}>{label}</button>
              ))}
            </div>
          </FilterPill>
          {present.length > 1 && (
            <FilterPill id="type" label={kinds.length ? `Type (${kinds.length})` : "Type"} open={open} setOpen={setOpen} active={kinds.length > 0}>
              <ul className="space-y-1 text-sm">
                {present.map((k) => (
                  <li key={k}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-surface-alt">
                      <input type="checkbox" checked={kinds.includes(k)} onChange={() => setKinds(kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k])} className="size-4 accent-brand-red" />
                      {kindLabel[k]}
                    </label>
                  </li>
                ))}
              </ul>
            </FilterPill>
          )}
          <FilterPill id="budget" label="Budget" open={open} setOpen={setOpen} active={budgetOn}>
            <RangeSlider label="Per person" min={lo} max={hi} step={1000} value={budget} onChange={setBudget} format={formatINR} />
          </FilterPill>
          <FilterPill id="sort" label="Sort" open={open} setOpen={setOpen} active={sort !== "saving"}>
            <fieldset>
              <legend className="sr-only">Sort offers by</legend>
              <ul className="space-y-1 text-sm">
                {sorts.map((s) => (
                  <li key={s.key}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-surface-alt">
                      <input type="radio" name="offers-sort" checked={sort === s.key} onChange={() => { setSort(s.key); setOpen(null); }} className="accent-brand-red" />
                      {s.label}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          </FilterPill>
          <button type="button" onClick={reset} disabled={active === 0 && sort === "saving"} className="flex items-center gap-1.5 rounded-full border border-black/15 bg-surface-alt px-4 py-2 text-sm font-semibold transition hover:border-brand-red disabled:cursor-not-allowed disabled:opacity-50">
            <RotateCcw size={14} aria-hidden /> Reset
          </button>
          <p className="ml-auto text-sm text-muted" aria-live="polite">{shown.length} offer{shown.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {shown.length > 0 ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((t) => (
              <li key={t.slug} className="contents">
                <TourCard tour={t} showSaving />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-card bg-surface-alt p-8 text-center">
            <BadgePercent className="mx-auto text-brand-red" size={32} aria-hidden />
            <p className="mt-2 text-lg font-bold">No offers match these filters</p>
            <p className="mt-1 text-sm text-muted">Try a wider budget, or tell us what you have in mind and we will look for the best price.</p>
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
