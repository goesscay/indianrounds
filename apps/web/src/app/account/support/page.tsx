import type { Metadata } from "next";
import { SupportView } from "@/components/AccountViews";

export const metadata: Metadata = { title: "Support", robots: { index: false, follow: false } };

export default function SupportPage() {
  return <SupportView />;
}
