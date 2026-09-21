import type { Metadata } from "next";
import { ProfileView } from "@/components/AccountViews";

export const metadata: Metadata = { title: "Profile", robots: { index: false, follow: false } };

export default function ProfilePage() {
  return <ProfileView />;
}
