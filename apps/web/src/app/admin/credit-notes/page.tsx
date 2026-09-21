import type { Metadata } from "next";
import { CreditNotesAdmin } from "@/components/admin/OpsViews";

export const metadata: Metadata = { title: "Credit notes" };

export default function Page() {
  return <CreditNotesAdmin />;
}
