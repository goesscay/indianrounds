import type { Metadata } from "next";
import { RegionPage } from "@/components/RegionPage";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Explore India",
  description: "India tour packages: Kerala, Rajasthan, Goa, Himachal, Kashmir, Ladakh, the Andamans and more, with group trips, weekend getaways and honeymoon escapes.",
  alternates: { canonical: "/explore-india" },
};

export default function ExploreIndiaPage() {
  return <RegionPage region="india" />;
}
