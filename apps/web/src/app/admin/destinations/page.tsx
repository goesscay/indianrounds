import type { Metadata } from "next";
import { DestinationsView } from "@/components/admin/ContentViews";

export const metadata: Metadata = { title: "Destinations" };

export default function Page() {
  return <DestinationsView />;
}
