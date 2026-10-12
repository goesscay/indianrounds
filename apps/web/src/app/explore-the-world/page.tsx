import type { Metadata } from "next";
import { RegionPage } from "@/components/RegionPage";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Explore the World",
  description: "International tour packages from India: Dubai, Thailand, Bali, Singapore, Vietnam, Georgia, Morocco and more, with group trips, weekend getaways and honeymoon escapes.",
  alternates: { canonical: "/explore-the-world" },
};

export default function ExploreTheWorldPage() {
  return <RegionPage region="international" />;
}
