import type { Metadata } from "next";
import { PostsView } from "@/components/admin/GrowthViews";

export const metadata: Metadata = { title: "Blog posts" };

export default function Page() {
  return <PostsView />;
}
