import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutWizard } from "@/components/CheckoutWizard";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p className="p-16 text-center text-muted">Loading…</p>}>
      <CheckoutWizard />
    </Suspense>
  );
}
