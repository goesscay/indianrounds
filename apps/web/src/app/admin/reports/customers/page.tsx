import type { Metadata } from "next";
import { CustomerReportView } from "@/components/admin/ReportViews";

export const metadata: Metadata = { title: "Customer reports" };

export default function Page() {
  return <CustomerReportView />;
}
