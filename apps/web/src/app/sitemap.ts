import type { MetadataRoute } from "next";
import { getCollections, getDestinations, getMenuCountries, getMenuCountry, getPosts, getTours, type MenuSlug } from "@/lib/api";
import { site } from "@/lib/site";

// Rendered per request (the underlying API fetches are cached for 60 s): a build made while the API is
// unreachable must not freeze an empty sitemap into the static output.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [destinations, tours, posts, collections] = await Promise.all([
    getDestinations(),
    getTours({ per_page: "24" }),
    getPosts({ per_page: "24" }),
    getCollections(),
  ]);
  const url = (path: string) => `${site.url}${path}`;
  const now = new Date();

  // Country and category pages of each menu (only those that actually have packages are listed by the API).
  const menus: MenuSlug[] = ["destinations", "group-tours", "weekend-escapes", "honeymoon", "christmas-new-year"];
  const menuPaths = (
    await Promise.all(
      menus.map(async (menu) => {
        const countries = await getMenuCountries(menu);
        const nested = await Promise.all(
          countries.map(async (c) => {
            const detail = await getMenuCountry(menu, c.slug);
            return [`/${menu}/${c.slug}`, ...(detail?.data ?? []).map((cat) => `/${menu}/${c.slug}/${cat.slug}`)];
          }),
        );
        return [...(menu === "destinations" ? [] : [`/${menu}`]), ...nested.flat()];
      }),
    )
  ).flat();

  const entries = [
    ...["", "/destinations", "/tours", "/about", "/contact", "/terms", "/privacy", "/disclaimer", "/customer-support", "/blog", "/corporate", "/custom-trips", "/careers", "/offers"].map((p) => ({
      url: url(p),
      lastModified: now,
    })),
    ...destinations.map((d) => ({ url: url(`/destinations/${d.slug}`), lastModified: now })),
    ...menuPaths.map((p) => ({ url: url(p), lastModified: now })),
    ...tours.data.map((t) => ({ url: url(`/tours/${t.slug}`), lastModified: now })),
    ...collections.map((c) => ({ url: url(`/collections/${c.slug}`), lastModified: now })),
    ...posts.data.map((p) => ({ url: url(`/blog/${p.slug}`), lastModified: p.published_at ? new Date(p.published_at) : now })),
  ];

  // A URL can be reached through more than one list above (e.g. a destination page): keep one entry each.
  return [...new Map(entries.map((e) => [e.url, e])).values()];
}
