import type { Metadata } from "next";
import { CustomersView } from "@/components/admin/ContentViews";

export const metadata: Metadata = { title: "Customers" };

export default function Page() {
  return <CustomersView />;
}
