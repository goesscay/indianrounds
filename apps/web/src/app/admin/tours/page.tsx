import type { Metadata } from "next";
import { ToursList } from "@/components/admin/ToursViews";

export const metadata: Metadata = { title: "Tours" };

export default function Page() {
  return <ToursList />;
}
