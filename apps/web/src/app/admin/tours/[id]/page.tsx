import type { Metadata } from "next";
import { TourEditor } from "@/components/admin/ToursViews";

export const metadata: Metadata = { title: "Tour" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TourEditor id={id} />;
}
