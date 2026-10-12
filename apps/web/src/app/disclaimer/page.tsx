import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, HeartPulse, Info } from "lucide-react";
import { LegalLayout, type LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "How to read the information on the Indian Rounds website: itineraries, prices, availability, photographs and travel health and safety.",
  alternates: { canonical: "/disclaimer" },
};

const sections: LegalSection[] = [
  {
    id: "information",
    title: "Information on this website",
    body: <p>Information on this website is provided in good faith and may change without notice.</p>,
  },
  {
    id: "photographs",
    title: "Photographs",
    body: <p>Photographs are illustrative.</p>,
  },
  {
    id: "itineraries-prices",
    title: "Itineraries, prices and availability",
    body: <p>Itineraries, prices and availability are subject to confirmation at the time of booking.</p>,
  },
  {
    id: "health-safety",
    title: "Health and safety",
    body: <p>Travel to remote or high-altitude regions carries health and safety risks. Please consult your doctor before travelling and disclose relevant medical conditions to us in advance.</p>,
  },
  {
    id: "contact",
    title: "Contact us",
    body: <p>If anything on the website is unclear, ask our team through the <Link href="/contact">Contact page</Link> before you book.</p>,
  },
];

export default function DisclaimerPage() {
  return (
    <LegalLayout
      title=""
      accent="Disclaimer"
      intro="How to read the information on this website, and what to check before you travel."
      path="/disclaimer"
      draft
      numbered
      highlights={[
        { icon: Info, title: "Provided in good faith", text: "Information may change without notice." },
        { icon: CheckCircle2, title: "Confirmed at booking", text: "Itineraries, prices and availability are confirmed when you book." },
        { icon: HeartPulse, title: "Check your health", text: "Consult your doctor before travelling to remote or high-altitude regions." },
      ]}
      sections={sections}
    />
  );
}
