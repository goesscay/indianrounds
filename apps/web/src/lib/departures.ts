/** Upcoming fixed-departure trips (group trips and weekend getaways) and the filtering behind the group trips page. */

export type Departure = { starts_on: string; seats_left: number };

export type DepartureTrip = {
  slug: string;
  title: string;
  duration_nights: number;
  duration_days: number;
  price: number | null;
  original_price: number | null;
  image_url: string | null;
  tags: string[];
  kind: "group" | "weekend";
  pickup: string | null;
  drop_point: string | null;
  destination: { name: string; slug: string; region: "india" | "international" };
  departures: Departure[];
  departure_count: number;
};

export type SortKey = "date" | "price_asc" | "price_desc" | "nights_asc" | "nights_desc";

export type Filters = {
  region: "all" | "india" | "international";
  destinations: string[];
  kind: "all" | "group" | "weekend";
  nights: [number, number];
  budget: [number, number];
  month: string | null;
  sort: SortKey;
};

export type Bounds = { nights: [number, number]; budget: [number, number]; months: string[] };

const BUDGET_STEP = 1000;

export function boundsOf(trips: DepartureTrip[]): Bounds {
  const nights = trips.map((t) => t.duration_nights);
  const prices = trips.map((t) => t.price).filter((p): p is number => p !== null);
  const months = [...new Set(trips.flatMap((t) => t.departures.map((d) => d.starts_on.slice(0, 7))))].sort();
  return {
    nights: nights.length ? [Math.min(...nights), Math.max(...nights)] : [1, 14],
    budget: prices.length ? [Math.floor(Math.min(...prices) / BUDGET_STEP) * BUDGET_STEP, Math.ceil(Math.max(...prices) / BUDGET_STEP) * BUDGET_STEP] : [0, 100000],
    months,
  };
}

export function defaultFilters(b: Bounds): Filters {
  return { region: "all", destinations: [], kind: "all", nights: [...b.nights], budget: [...b.budget], month: null, sort: "date" };
}

export function activeFilterCount(f: Filters, b: Bounds): number {
  return (
    (f.region !== "all" ? 1 : 0) +
    (f.destinations.length ? 1 : 0) +
    (f.kind !== "all" ? 1 : 0) +
    (f.nights[0] > b.nights[0] || f.nights[1] < b.nights[1] ? 1 : 0) +
    (f.budget[0] > b.budget[0] || f.budget[1] < b.budget[1] ? 1 : 0) +
    (f.month ? 1 : 0)
  );
}

/** Trips that pass every filter, each with the departures that fall in the chosen month (all of them when none is chosen), sorted. */
export function applyFilters(trips: DepartureTrip[], f: Filters, b: Bounds): (DepartureTrip & { shown: Departure[] })[] {
  const budgetActive = f.budget[0] > b.budget[0] || f.budget[1] < b.budget[1];
  const out = trips
    .filter((t) => f.region === "all" || t.destination.region === f.region)
    .filter((t) => !f.destinations.length || f.destinations.includes(t.destination.slug))
    .filter((t) => f.kind === "all" || t.kind === f.kind)
    .filter((t) => t.duration_nights >= f.nights[0] && t.duration_nights <= f.nights[1])
    .filter((t) => (t.price === null ? !budgetActive : t.price >= f.budget[0] && t.price <= f.budget[1]))
    .map((t) => ({ ...t, shown: f.month ? t.departures.filter((d) => d.starts_on.startsWith(f.month!)) : t.departures }))
    .filter((t) => t.shown.length > 0);

  const price = (t: DepartureTrip, empty: number) => t.price ?? empty;
  const by: Record<SortKey, (a: DepartureTrip & { shown: Departure[] }, c: DepartureTrip & { shown: Departure[] }) => number> = {
    date: (a, c) => a.shown[0].starts_on.localeCompare(c.shown[0].starts_on) || a.title.localeCompare(c.title),
    price_asc: (a, c) => price(a, Infinity) - price(c, Infinity),
    price_desc: (a, c) => price(c, -1) - price(a, -1),
    nights_asc: (a, c) => a.duration_nights - c.duration_nights,
    nights_desc: (a, c) => c.duration_nights - a.duration_nights,
  };
  return out.sort(by[f.sort]);
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Filters from a query string such as "?region=india&nights=2-6&month=2026-12"; anything invalid falls back to the default. */
export function parseFilters(search: string, b: Bounds): Filters {
  const q = new URLSearchParams(search);
  const d = defaultFilters(b);
  const range = (key: string, lo: number, hi: number): [number, number] => {
    const m = /^(\d+)-(\d+)$/.exec(q.get(key) ?? "");
    if (!m) return [lo, hi];
    const a = clamp(Number(m[1]), lo, hi);
    const c = clamp(Number(m[2]), lo, hi);
    return a <= c ? [a, c] : [lo, hi];
  };
  const region = q.get("region");
  const kind = q.get("type");
  const sort = q.get("sort");
  const month = q.get("month");
  return {
    region: region === "india" || region === "international" ? region : d.region,
    destinations: (q.get("to") ?? "").split(",").filter(Boolean),
    kind: kind === "group" || kind === "weekend" ? kind : d.kind,
    nights: range("nights", b.nights[0], b.nights[1]),
    budget: range("budget", b.budget[0], b.budget[1]),
    month: month && b.months.includes(month) ? month : null,
    sort: sort === "price_asc" || sort === "price_desc" || sort === "nights_asc" || sort === "nights_desc" ? sort : d.sort,
  };
}

/** The query string for the current filters, leaving out everything still at its default. */
export function serializeFilters(f: Filters, b: Bounds): string {
  const q = new URLSearchParams();
  if (f.region !== "all") q.set("region", f.region);
  if (f.destinations.length) q.set("to", f.destinations.join(","));
  if (f.kind !== "all") q.set("type", f.kind);
  if (f.nights[0] > b.nights[0] || f.nights[1] < b.nights[1]) q.set("nights", `${f.nights[0]}-${f.nights[1]}`);
  if (f.budget[0] > b.budget[0] || f.budget[1] < b.budget[1]) q.set("budget", `${f.budget[0]}-${f.budget[1]}`);
  if (f.month) q.set("month", f.month);
  if (f.sort !== "date") q.set("sort", f.sort);
  const s = q.toString();
  return s ? `?${s}` : "";
}
