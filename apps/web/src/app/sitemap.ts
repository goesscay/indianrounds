import type { MetadataRoute } from "next";
import { getDestinations, getTours } from "@/lib/api";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [destinations, tours] = await Promise.all([getDestinations(), getTours({ per_page: "24" })]);
  const url = (path: string) => `${site.url}${path}`;
  const now = new Date();

  return [
    ...["", "/destinations", "/tours", "/about", "/contact", "/terms", "/privacy", "/disclaimer", "/customer-support"].map((p) => ({
      url: url(p),
      lastModified: now,
    })),
    ...destinations.map((d) => ({ url: url(`/destinations/${d.slug}`), lastModified: now })),
    ...tours.data.map((t) => ({ url: url(`/tours/${t.slug}`), lastModified: now })),
  ];
}
