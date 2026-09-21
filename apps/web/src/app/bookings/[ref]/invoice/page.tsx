import type { Metadata } from "next";
import { InvoiceView } from "@/components/InvoiceView";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

export default async function InvoicePage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return <InvoiceView reference={ref} />;
}
