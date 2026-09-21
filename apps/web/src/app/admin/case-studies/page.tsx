import type { Metadata } from "next";
import { CaseStudiesView } from "@/components/admin/GrowthViews";

export const metadata: Metadata = { title: "Case studies" };

export default function Page() {
  return <CaseStudiesView />;
}
