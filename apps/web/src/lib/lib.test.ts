import { describe, expect, it } from "vitest";
import { safeNext } from "./client-api";
import { durationLabel, formatDate, formatINR, formatMonth } from "./format";
import { legacyRedirects } from "./redirects";
import { sameOrigin } from "./same-origin";

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
