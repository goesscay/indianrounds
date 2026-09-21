import type { Metadata } from "next";
import { BookingDetail } from "@/components/BookingsView";

export const metadata: Metadata = { title: "Booking", robots: { index: false, follow: false } };

export default async function BookingPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return <BookingDetail reference={ref} />;
}
