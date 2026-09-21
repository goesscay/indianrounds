import type { Metadata } from "next";
import { BookingsAdminList } from "@/components/admin/OpsViews";

export const metadata: Metadata = { title: "Bookings" };

export default function Page() {
  return <BookingsAdminList />;
}
