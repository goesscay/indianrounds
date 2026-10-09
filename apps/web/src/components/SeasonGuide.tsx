import { CalendarDays, MapPin } from "lucide-react";
import type { Destination } from "@/lib/api";
import { seasonByMonth, type SeasonKey } from "@/lib/seasons";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Order follows the destination sheet: On, Off, Mid. Colours also differ by label, never by colour alone.
const seasons: { key: SeasonKey; label: string; swatch: string; cell: string; ring: string }[] = [
  { key: "on", label: "On season", swatch: "bg-brand-red", cell: "bg-brand-red text-white", ring: "border-t-brand-red" },
  { key: "off", label: "Off season", swatch: "bg-slate-500", cell: "bg-slate-500 text-white", ring: "border-t-slate-500" },
  { key: "mid", label: "Mid season", swatch: "bg-amber-400", cell: "bg-amber-400 text-ink", ring: "border-t-amber-400" },
];
const labelOf = Object.fromEntries(seasons.map((s) => [s.key, s.label])) as Record<SeasonKey, string>;

/**
 * The on / off / mid season guide for a destination: a 12-month strip for a quick read, then one card per
 * season with its months, top places and peak activities. Renders nothing for a destination without them.
 */
export function SeasonGuide({ destination }: { destination: Destination }) {
  const content = destination.seo_content;
  const available = seasons.filter((s) => content?.seasons?.[s.key]);
  if (available.length === 0) return null;
  const strip = seasonByMonth(content!.seasons!);

  return (
    <section aria-labelledby="season-h" className="mb-12 rounded-card border border-black/10 bg-white p-5 shadow-sm sm:p-6">
      <h2 id="season-h" className="text-2xl font-extrabold">
        When to go to <span className="text-brand-red">{destination.name}</span>
      </h2>
      {content?.places && (
        <p className="mt-2 flex items-start gap-2 text-sm text-muted">
          <MapPin size={18} className="mt-0.5 shrink-0 text-brand-red" aria-hidden />
          <span><strong className="text-ink">Places covered:</strong> {content.places}</span>
        </p>
      )}

      {strip && (
        <div className="mt-5">
          <ol className="grid grid-cols-12 gap-1 text-center text-[10px] font-semibold sm:text-xs" aria-label="Season for each month">
            {strip.map((k, i) => (
              <li key={MONTH_LABELS[i]} className={`rounded py-1.5 ${k ? seasons.find((s) => s.key === k)!.cell : "bg-surface-alt text-muted"}`}>
                {MONTH_LABELS[i]}
                <span className="sr-only">{k ? `: ${labelOf[k]}` : ": no season set"}</span>
              </li>
            ))}
          </ol>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            {available.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className={`size-2.5 rounded-sm ${s.swatch}`} aria-hidden /> {s.label}: <strong className="text-ink">{content!.seasons![s.key]!.months}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {available.map(({ key, label, ring }) => {
          const s = content!.seasons![key]!;
          return (
            <article key={key} className={`rounded-lg border border-black/10 border-t-4 bg-surface-alt/50 p-4 ${ring}`}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{label}</h3>
              <p className="mt-1 flex items-center gap-2 text-xl font-extrabold">
                <CalendarDays size={20} className="text-brand-red" aria-hidden /> {s.months}
              </p>
              {s.places && <p className="mt-3 text-sm"><strong>Top places:</strong> {s.places}</p>}
              {s.activities && <p className="mt-2 text-sm text-muted first-letter:uppercase"><strong className="text-ink">Peak activities:</strong> {s.activities}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
