import type { Metadata } from "next";
import { GrievanceDetail } from "@/components/admin/SystemViews";

export const metadata: Metadata = { title: "Grievance" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GrievanceDetail id={id} />;
}
