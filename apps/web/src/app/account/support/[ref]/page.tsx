import type { Metadata } from "next";
import { SupportDetailView } from "@/components/AccountViews";

export const metadata: Metadata = { title: "Support ticket", robots: { index: false, follow: false } };

export default async function SupportTicketPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return <SupportDetailView reference={ref} />;
}
