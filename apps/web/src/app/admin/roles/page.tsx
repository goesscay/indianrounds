import type { Metadata } from "next";
import { RolesView } from "@/components/admin/SystemViews";

export const metadata: Metadata = { title: "Roles & access" };

export default function Page() {
  return <RolesView />;
}
