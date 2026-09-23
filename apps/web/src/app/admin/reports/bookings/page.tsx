import type { Metadata } from "next";
import { BookingReportView } from "@/components/admin/ReportViews";

export const metadata: Metadata = { title: "Booking reports" };

export default function Page() {
  return <BookingReportView />;
}
