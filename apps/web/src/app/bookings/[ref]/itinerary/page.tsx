import type { Metadata } from "next";
import { ItineraryView } from "@/components/ItineraryView";

export const metadata: Metadata = { title: "Itinerary", robots: { index: false, follow: false } };

export default async function ItineraryPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return <ItineraryView reference={ref} />;
}
