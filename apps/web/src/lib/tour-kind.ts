import type { Tour } from "./api";

/**
 * Group tours and weekend escapes run on fixed departure dates, so they show those dates and the
 * online booking flow. Every other package (destination, honeymoon, festive...) is priced and
 * dated per enquiry: it shows only a "from" price and routes the visitor to the team instead.
 */
export function hasFixedDepartures(tour: Pick<Tour, "tour_type" | "tags">): boolean {
  return tour.tour_type === "group" || (tour.tags ?? []).includes("weekend");
}
