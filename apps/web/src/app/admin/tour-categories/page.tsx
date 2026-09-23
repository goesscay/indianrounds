import type { Metadata } from "next";
import { TourCategoriesView } from "@/components/admin/ToursViews";

export const metadata: Metadata = { title: "Tour categories" };

export default function Page() {
  return <TourCategoriesView />;
}
