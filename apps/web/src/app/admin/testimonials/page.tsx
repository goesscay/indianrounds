import type { Metadata } from "next";
import { TestimonialsView } from "@/components/admin/ContentViews";

export const metadata: Metadata = { title: "Testimonials" };

export default function Page() {
  return <TestimonialsView />;
}
