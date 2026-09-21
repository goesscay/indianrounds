import type { MetadataRoute } from "next";
import { getCollections, getDestinations, getPosts, getTours } from "@/lib/api";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [destinations, tours, posts, collections] = await Promise.all([
    getDestinations(),
    getTours({ per_page: "24" }),
    getPosts({ per_page: "24" }),
    getCollections(),
  ]);
  const url = (path: string) => `${site.url}${path}`;
  const now = new Date();

  return [
    ...["", "/destinations", "/tours", "/about", "/contact", "/terms", "/privacy", "/disclaimer", "/customer-support", "/blog", "/corporate", "/custom-trips", "/careers"].map((p) => ({
      url: url(p),
      lastModified: now,
    })),
    ...destinations.map((d) => ({ url: url(`/destinations/${d.slug}`), lastModified: now })),
    ...tours.data.map((t) => ({ url: url(`/tours/${t.slug}`), lastModified: now })),
    ...collections.map((c) => ({ url: url(`/collections/${c.slug}`), lastModified: now })),
    ...posts.data.map((p) => ({ url: url(`/blog/${p.slug}`), lastModified: p.published_at ? new Date(p.published_at) : now })),
  ];
}
