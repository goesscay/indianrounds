import type { Metadata } from "next";
import { PaymentReportView } from "@/components/admin/ReportViews";

export const metadata: Metadata = { title: "Payment reports" };

export default function Page() {
  return <PaymentReportView />;
}
