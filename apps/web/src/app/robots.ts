import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/style-guide", "/tours/*/dates", "/checkout", "/bookings", "/login", "/register", "/forgot-password", "/reset-password", "/api/"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
