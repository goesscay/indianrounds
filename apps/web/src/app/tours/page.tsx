import type { Metadata } from "next";
import Link from "next/link";
import { getDestinations, getTours } from "@/lib/api";
import { TourCard } from "@/components/TourCard";

export const metadata: Metadata = {
  title: "Tour Packages",
  description: "Browse curated India and international tour packages. Filter by destination, budget, duration and travel month.",
  alternates: { canonical: "/tours" },
};

type SP = Record<string, string | undefined>;

const budgets: Record<string, { label: string; min?: string; max?: string }> = {
  "": { label: "Any budget" },
  "0-25000": { label: "Under ₹25,000", max: "25000" },
  "25000-50000": { label: "₹25,000 – ₹50,000", min: "25000", max: "50000" },
  "50000-100000": { label: "₹50,000 – ₹1,00,000", min: "50000", max: "100000" },
  "100000-": { label: "Above ₹1,00,000", min: "100000" },
};

const durations: Record<string, { label: string; min?: string; max?: string }> = {
  "": { label: "Any duration" },
  short: { label: "Up to 3 nights", max: "3" },
  medium: { label: "4 – 5 nights", min: "4", max: "5" },
  long: { label: "6+ nights", min: "6" },
};

const sorts: Record<string, string> = {
  popular: "Popular",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  duration_asc: "Duration: Shortest",
  duration_desc: "Duration: Longest",
};

const control = "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20";

export default async function ToursPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const b = budgets[sp.budget ?? ""] ?? budgets[""];
  const d = durations[sp.duration ?? ""] ?? durations[""];

  const [destinations, result] = await Promise.all([
    getDestinations(),
    getTours({
      destination: sp.destination,
      month: sp.month,
      sort: sp.sort,
      q: sp.q,
      page: sp.page,
      min_price: b.min,
      max_price: b.max,
      min_nights: d.min,
      max_nights: d.max,
      per_page: "12",
    }),
  ]);

  const page = result.meta?.current_page ?? 1;
  const last = result.meta?.last_page ?? 1;
  const total = result.meta?.total ?? result.data.length;
  const pageHref = (p: number) => {
    const q = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]);
    q.set("page", String(p));
    return `/tours?${q.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold sm:text-5xl">
          Tour <span className="text-brand-red">Packages</span>
        </h1>
        <p className="mt-2 text-muted">{total} tour{total === 1 ? "" : "s"} found</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
        <form action="/tours" method="get" className="h-fit space-y-4 rounded-card bg-surface-alt p-5 lg:sticky lg:top-24">
          <div>
            <label htmlFor="f-q" className="mb-1 block text-xs font-semibold">Search</label>
            <input id="f-q" name="q" defaultValue={sp.q} placeholder="Tour or destination" className={control} />
          </div>
          <div>
            <label htmlFor="f-dest" className="mb-1 block text-xs font-semibold">Destination</label>
            <select id="f-dest" name="destination" defaultValue={sp.destination ?? ""} className={control}>
              <option value="">All destinations</option>
              {destinations.map((x) => (
                <option key={x.slug} value={x.slug}>{x.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-budget" className="mb-1 block text-xs font-semibold">Budget (per person)</label>
            <select id="f-budget" name="budget" defaultValue={sp.budget ?? ""} className={control}>
              {Object.entries(budgets).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-dur" className="mb-1 block text-xs font-semibold">Duration</label>
            <select id="f-dur" name="duration" defaultValue={sp.duration ?? ""} className={control}>
              {Object.entries(durations).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-month" className="mb-1 block text-xs font-semibold">Travel month</label>
            <input id="f-month" name="month" type="month" defaultValue={sp.month} className={control} />
          </div>
          <div>
            <label htmlFor="f-sort" className="mb-1 block text-xs font-semibold">Sort by</label>
            <select id="f-sort" name="sort" defaultValue={sp.sort ?? "popular"} className={control}>
              {Object.entries(sorts).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-full bg-brand-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark">Apply</button>
            <Link href="/tours" className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-semibold hover:border-brand-red">Reset</Link>
          </div>
        </form>

        <div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {result.data.map((t) => (
              <TourCard key={t.slug} tour={t} />
            ))}
          </div>
          {result.data.length === 0 && (
            <div className="rounded-card bg-surface-alt p-8 text-center">
              <p className="font-semibold">No tours match these filters.</p>
              <Link href="/tours" className="mt-2 inline-block text-brand-red underline">Clear filters</Link>
            </div>
          )}
          {last > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
              {page > 1 && <Link href={pageHref(page - 1)} className="rounded-full border border-brand-red px-5 py-2 text-sm font-semibold text-brand-red">Previous</Link>}
              <span className="text-sm text-muted">Page {page} of {last}</span>
              {page < last && <Link href={pageHref(page + 1)} className="rounded-full border border-brand-red px-5 py-2 text-sm font-semibold text-brand-red">Next</Link>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
