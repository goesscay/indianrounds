import type { Metadata } from "next";
import { CareersView } from "@/components/admin/GrowthViews";

export const metadata: Metadata = { title: "Careers" };

export default function Page() {
  return <CareersView />;
}
