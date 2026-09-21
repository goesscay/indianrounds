import type { Metadata } from "next";
import { BookingAdminDetail } from "@/components/admin/OpsViews";

export const metadata: Metadata = { title: "Booking" };

export default async function Page({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return <BookingAdminDetail reference={ref} />;
}
