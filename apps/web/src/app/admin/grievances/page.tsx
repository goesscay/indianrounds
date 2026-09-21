import type { Metadata } from "next";
import { GrievancesList } from "@/components/admin/SystemViews";

export const metadata: Metadata = { title: "Grievances" };

export default function Page() {
  return <GrievancesList />;
}
