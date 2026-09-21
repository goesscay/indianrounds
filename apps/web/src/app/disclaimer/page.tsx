import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Disclaimer", alternates: { canonical: "/disclaimer" } };

export default function DisclaimerPage() {
  return (
    <PageShell title="" accent="Disclaimer" draft>
      <p>Information on this website is provided in good faith and may change without notice. Photographs are illustrative. Itineraries, prices and availability are subject to confirmation at the time of booking.</p>
      <p>Travel to remote or high-altitude regions carries health and safety risks. Please consult your doctor before travelling and disclose relevant medical conditions to us in advance.</p>
    </PageShell>
  );
}
