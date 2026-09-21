import type { Metadata } from "next";
import { CreditNotesView } from "@/components/AccountViews";

export const metadata: Metadata = { title: "Credit notes", robots: { index: false, follow: false } };

export default function CreditNotesPage() {
  return <CreditNotesView />;
}
