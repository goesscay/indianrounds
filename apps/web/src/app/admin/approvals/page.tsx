import type { Metadata } from "next";
import { ApprovalsView } from "@/components/admin/OpsViews";

export const metadata: Metadata = { title: "Approvals" };

export default function Page() {
  return <ApprovalsView />;
}
