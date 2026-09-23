import type { Metadata } from "next";
import { SalesReportView } from "@/components/admin/ReportViews";

export const metadata: Metadata = { title: "Sales reports" };

export default function Page() {
  return <SalesReportView />;
}
