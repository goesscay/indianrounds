import type { Metadata } from "next";
import { RefundsView } from "@/components/admin/OpsViews";

export const metadata: Metadata = { title: "Refunds" };

export default function Page() {
  return <RefundsView />;
}
