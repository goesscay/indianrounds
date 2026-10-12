import { describe, expect, it } from "vitest";
import { safeNext } from "./client-api";
import { activeFilterCount, applyFilters, boundsOf, defaultFilters, parseFilters, serializeFilters, type DepartureTrip } from "./departures";
import { durationLabel, formatDate, formatINR, formatMonth } from "./format";
import { legacyRedirects } from "./redirects";
import { sameOrigin } from "./same-origin";
import { monthsInRange, seasonByMonth } from "./seasons";
import { hasFixedDepartures } from "./tour-kind";

describe("seasons", () => {
  it("reads month ranges, including ones that wrap the year", () => {
    expect(monthsInRange("Oct–Mar")).toEqual([9, 10, 11, 0, 1, 2]);
    expect(monthsInRange("Apr-Jun")).toEqual([3, 4, 5]);
    expect(monthsInRange("June to August")).toEqual([5, 6, 7]);
    expect(monthsInRange("Dec")).toEqual([11]);
    expect(monthsInRange("whenever")).toBeNull();
    expect(monthsInRange("Foo–Bar")).toBeNull();
  });

  it("maps every month to its season and gives up if any range is unreadable", () => {
    const s = (months: string) => ({ months, places: "", activities: "" });
    expect(seasonByMonth({ on: s("Oct–Mar"), off: s("Jun–Sep"), mid: s("Apr–May") })).toEqual(["on", "on", "on", "mid", "mid", "off", "off", "off", "off", "on", "on", "on"]);
    expect(seasonByMonth({ on: s("May–Jul") })).toEqual([null, null, null, null, "on", "on", "on", null, null, null, null, null]);
    expect(seasonByMonth({ on: s("Oct–Mar"), off: s("soon") })).toBeNull();
  });
});

describe("tour kind", () => {
  it("only group tours and weekend escapes use fixed departure dates", () => {
    expect(hasFixedDepartures({ tour_type: "group", tags: [] })).toBe(true);
    expect(hasFixedDepartures({ tour_type: "group" })).toBe(true);
    expect(hasFixedDepartures({ tour_type: "custom", tags: ["weekend", "family"] })).toBe(true);
    expect(hasFixedDepartures({ tour_type: "custom", tags: ["couples"] })).toBe(false);
    expect(hasFixedDepartures({ tour_type: "custom" })).toBe(false);
  });
});

describe("format", () => {
  it("formats rupees with Indian digit grouping", () => {
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(999)).toBe("₹999");
    expect(formatINR(125000)).toBe("₹1,25,000");
    expect(formatINR(12345678)).toBe("₹1,23,45,678");
  });

  it("formats date-only strings without shifting the day across time zones", () => {
    expect(formatDate("2026-12-31")).toBe("31 Dec 2026");
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
    expect(formatMonth("2026-03-15")).toBe("March 2026");
  });

  it("labels durations", () => {
    expect(durationLabel(5, 6)).toBe("6 Days 5 Nights");
  });
});

describe("safeNext (post-login redirect)", () => {
  it("allows same-site paths", () => {
    expect(safeNext("/bookings/IR123")).toBe("/bookings/IR123");
    expect(safeNext("/checkout?tour=a&batch=1")).toBe("/checkout?tour=a&batch=1");
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "evil", "", null, undefined])("rejects %s", (bad) => {
    expect(safeNext(bad as string | null | undefined)).toBe("/bookings");
  });

  it("uses the supplied fallback", () => {
    expect(safeNext("//x", "/account")).toBe("/account");
  });
});

describe("sameOrigin (proxy CSRF guard)", () => {
  const req = (h: Record<string, string>) => ({ headers: new Headers(h) });

  it("accepts a matching Origin", () => {
    expect(sameOrigin(req({ origin: "https://indianrounds.in", host: "indianrounds.in" }))).toBe(true);
  });

  it("prefers the forwarded host behind a load balancer", () => {
    expect(sameOrigin(req({ origin: "https://indianrounds.in", host: "10.0.0.5:3000", "x-forwarded-host": "indianrounds.in" }))).toBe(true);
  });

  it("rejects a foreign or malformed Origin", () => {
    expect(sameOrigin(req({ origin: "https://evil.example", host: "indianrounds.in" }))).toBe(false);
    expect(sameOrigin(req({ origin: "null", host: "indianrounds.in" }))).toBe(false);
    expect(sameOrigin(req({ origin: "https://indianrounds.in.evil.example", host: "indianrounds.in" }))).toBe(false);
  });

  it("allows requests with no Origin (server-to-server)", () => {
    expect(sameOrigin(req({ host: "indianrounds.in" }))).toBe(true);
  });
});

describe("legacy redirects", () => {
  const sources = legacyRedirects.map(([s]) => s);

  it("has no duplicate sources", () => {
    expect(new Set(sources).size).toBe(sources.length);
  });

  it("never chains or loops (a destination is never itself redirected)", () => {
    const base = (p: string) => p.replace(/\/:[^/]+/g, "");
    for (const [s, d] of legacyRedirects) {
      expect(base(d)).not.toBe(base(s));
      expect(sources).not.toContain(d);
    }
  });

  it("uses absolute paths", () => {
    for (const [s, d] of legacyRedirects) {
      expect(s.startsWith("/")).toBe(true);
      expect(d.startsWith("/")).toBe(true);
    }
  });
});

describe("departure filters", () => {
  const trip = (slug: string, o: Partial<DepartureTrip> & { dates: string[] }): DepartureTrip => ({
    slug, title: slug, duration_nights: 5, duration_days: 6, price: 30000, original_price: null, image_url: null, tags: [], kind: "group", pickup: null, drop_point: null,
    destination: { name: "Thailand", slug: "thailand", region: "international" }, departures: o.dates.map((d) => ({ starts_on: d, seats_left: 10 })), departure_count: o.dates.length, ...o,
  });
  const trips = [
    trip("bangkok", { dates: ["2026-11-06", "2026-12-04"] }),
    trip("kerala", { dates: ["2026-11-20"], duration_nights: 2, price: 15000, kind: "weekend", destination: { name: "Kerala", slug: "kerala", region: "india" } }),
    trip("tanzania", { dates: ["2027-01-09"], duration_nights: 9, price: 210000, destination: { name: "Tanzania", slug: "tanzania", region: "international" } }),
    trip("quote", { dates: ["2026-12-11"], price: null }),
  ];
  const b = boundsOf(trips);

  it("works out the slider ranges and the months that have departures", () => {
    expect(b.nights).toEqual([2, 9]);
    expect(b.budget).toEqual([15000, 210000]);
    expect(b.months).toEqual(["2026-11", "2026-12", "2027-01"]);
  });

  it("shows everything by default, earliest departure first", () => {
    const out = applyFilters(trips, defaultFilters(b), b);
    expect(out.map((t) => t.slug)).toEqual(["bangkok", "kerala", "quote", "tanzania"]);
  });

  it("filters by region, destination, type, nights and budget together", () => {
    const f = defaultFilters(b);
    expect(applyFilters(trips, { ...f, region: "india" }, b).map((t) => t.slug)).toEqual(["kerala"]);
    expect(applyFilters(trips, { ...f, destinations: ["thailand", "tanzania"] }, b).map((t) => t.slug)).toEqual(["bangkok", "quote", "tanzania"]);
    expect(applyFilters(trips, { ...f, kind: "weekend" }, b).map((t) => t.slug)).toEqual(["kerala"]);
    expect(applyFilters(trips, { ...f, nights: [4, 6] }, b).map((t) => t.slug)).toEqual(["bangkok", "quote"]);
    expect(applyFilters(trips, { ...f, budget: [15000, 40000] }, b).map((t) => t.slug)).toEqual(["bangkok", "kerala"]);
  });

  it("keeps trips with no visible price unless a budget is set", () => {
    const f = defaultFilters(b);
    expect(applyFilters(trips, f, b).some((t) => t.slug === "quote")).toBe(true);
    expect(applyFilters(trips, { ...f, budget: [15000, 100000] }, b).some((t) => t.slug === "quote")).toBe(false);
  });

  it("a month keeps only the trips and the dates that fall in it", () => {
    const out = applyFilters(trips, { ...defaultFilters(b), month: "2026-12" }, b);
    expect(out.map((t) => [t.slug, t.shown.map((d) => d.starts_on)])).toEqual([["bangkok", ["2026-12-04"]], ["quote", ["2026-12-11"]]]);
  });

  it("sorts by price and length", () => {
    const f = defaultFilters(b);
    expect(applyFilters(trips, { ...f, sort: "price_asc" }, b).map((t) => t.slug)).toEqual(["kerala", "bangkok", "tanzania", "quote"]);
    expect(applyFilters(trips, { ...f, sort: "price_desc" }, b).map((t) => t.slug)).toEqual(["tanzania", "bangkok", "kerala", "quote"]);
    expect(applyFilters(trips, { ...f, sort: "nights_desc" }, b)[0].slug).toBe("tanzania");
  });

  it("counts active filters and round-trips through the URL", () => {
    const f = { ...defaultFilters(b), region: "india" as const, nights: [2, 5] as [number, number], month: "2026-11", sort: "price_asc" as const };
    expect(activeFilterCount(defaultFilters(b), b)).toBe(0);
    expect(activeFilterCount(f, b)).toBe(3);
    const qs = serializeFilters(f, b);
    expect(qs).toBe("?region=india&nights=2-5&month=2026-11&sort=price_asc");
    expect(parseFilters(qs, b)).toEqual(f);
    expect(serializeFilters(defaultFilters(b), b)).toBe("");
  });

  it("ignores junk in the URL", () => {
    const f = parseFilters("?region=mars&nights=9-2&budget=abc&month=2031-01&sort=wild&type=x", b);
    expect(f).toEqual(defaultFilters(b));
    expect(parseFilters("?nights=0-99", b).nights).toEqual(b.nights);
  });
});
