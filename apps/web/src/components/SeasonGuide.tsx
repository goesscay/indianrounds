"use client";

import { useState, type KeyboardEvent } from "react";
import type { Destination } from "@/lib/api";
import { seasonByMonth, type SeasonKey } from "@/lib/seasons";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Order follows the destination sheet: On, Off, Mid. Colours also differ by label, never by colour alone.
const seasons: { key: SeasonKey; label: string; swatch: string; cell: string; underline: string }[] = [
  { key: "on", label: "On season", swatch: "bg-brand-red", cell: "bg-brand-red text-white", underline: "border-brand-red" },
  { key: "off", label: "Off season", swatch: "bg-slate-500", cell: "bg-slate-500 text-white", underline: "border-slate-500" },
  { key: "mid", label: "Mid season", swatch: "bg-amber-400", cell: "bg-amber-400 text-ink", underline: "border-amber-400" },
];
const labelOf = Object.fromEntries(seasons.map((s) => [s.key, s.label])) as Record<SeasonKey, string>;

/**
 * Compact on / off / mid season guide: one tab per season (months + label), a thin 12-month strip, and the
 * selected season's top places and peak activities. Renders nothing for a destination without seasons.
 */
export function SeasonGuide({ destination }: { destination: Destination }) {
  const content = destination.seo_content;
  const available = seasons.filter((s) => content?.seasons?.[s.key]);
  const [active, setActive] = useState<SeasonKey>(available[0]?.key ?? "on");
  if (available.length === 0) return null;
  const strip = seasonByMonth(content!.seasons!);
  const current = available.find((s) => s.key === active) ?? available[0];
  const s = content!.seasons![current.key]!;

  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = available[(i + step + available.length) % available.length];
    setActive(next.key);
    document.getElementById(`season-tab-${next.key}`)?.focus();
  }

  return (
    <section aria-labelledby="season-h" className="rounded-card border border-black/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 id="season-h" className="text-xl font-extrabold sm:text-2xl">
          Best time to visit <span className="text-brand-red">{destination.name}</span>
        </h2>
        {strip && (
          <ol className="grid w-full grid-cols-12 gap-0.5 text-center text-[10px] font-semibold sm:w-auto sm:min-w-[22rem]" aria-label="Season for each month">
            {strip.map((k, i) => (
              <li key={MONTH_LABELS[i]} className={`rounded-sm py-1 ${k ? seasons.find((x) => x.key === k)!.cell : "bg-surface-alt text-muted"}`}>
                {MONTH_LABELS[i].slice(0, 3)}
                <span className="sr-only">{k ? `: ${labelOf[k]}` : ": no season set"}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div role="tablist" aria-label="Seasons" className="mt-3 flex border-b border-black/10">
        {available.map((x, i) => {
          const selected = x.key === current.key;
          return (
            <button
              key={x.key}
              id={`season-tab-${x.key}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls="season-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(x.key)}
              onKeyDown={(e) => onKey(e, i)}
              className={`-mb-px min-w-0 flex-1 border-b-2 px-2 py-2 text-left sm:flex-none sm:px-4 ${selected ? `${x.underline} text-ink` : "border-transparent text-muted hover:text-ink"}`}
            >
              <span className="block text-sm font-extrabold">{content!.seasons![x.key]!.months}</span>
              <span className="flex items-center gap-1.5 text-xs">
                <span className={`size-2 rounded-full ${x.swatch}`} aria-hidden /> {x.label}
              </span>
            </button>
          );
        })}
      </div>

      <div id="season-panel" role="tabpanel" aria-labelledby={`season-tab-${current.key}`} className="grid gap-x-8 gap-y-2 pt-3 text-sm sm:grid-cols-2">
        {s.places && <p><strong>Top places:</strong> <span className="text-muted">{s.places}</span></p>}
        {s.activities && <p><strong>Peak activities:</strong> <span className="text-muted first-letter:uppercase">{s.activities}</span></p>}
      </div>
    </section>
  );
}
