import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleCallback } from "@/components/GoogleCallback";

export const metadata: Metadata = { title: "Signing in", robots: { index: false } };

export default function GoogleCallbackPage() {
  return (
    <Suspense>
      <GoogleCallback />
    </Suspense>
  );
}
