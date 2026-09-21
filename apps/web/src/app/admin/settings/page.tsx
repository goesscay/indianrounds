import type { Metadata } from "next";
import { SettingsView } from "@/components/admin/SystemViews";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <SettingsView />;
}
