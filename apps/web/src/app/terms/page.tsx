import type { Metadata } from "next";
import Link from "next/link";
import { BadgeIndianRupee, CalendarCheck, ShieldAlert } from "lucide-react";
import { LegalLayout, type LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that govern use of the Indian Rounds website and the tours we organise: bookings, prices, payments, changes and liability.",
  alternates: { canonical: "/terms" },
};

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: <p>Indian Rounds organises group and customised tours. We coordinate services delivered by independent third parties such as hotels, transport operators and local guides.</p>,
  },
  {
    id: "bookings",
    title: "Bookings",
    body: <p>A booking is confirmed only after the required advance payment is received and a written confirmation is issued. You must provide accurate traveller details, including a valid government photo ID or passport.</p>,
  },
  {
    id: "prices",
    title: "Prices",
    body: (
      <ul>
        <li>Prices are per person and shown in Indian Rupees.</li>
        <li>GST and other applicable taxes are added at checkout.</li>
        <li>Prices may change until a booking is confirmed.</li>
      </ul>
    ),
  },
  {
    id: "payments",
    title: "Payments",
    body: <p>The payment schedule for each tour is shown at checkout. Missing a due payment may lead to cancellation of the booking.</p>,
  },
  {
    id: "cancellations",
    title: "Cancellations and refunds",
    body: <p>The cancellation and refund schedule will be published here once finalised by Indian Rounds.</p>,
  },
  {
    id: "changes",
    title: "Changes to a tour",
    body: <p>Itineraries may change because of weather, road conditions, permits or safety. Where we cancel a tour we will offer an alternative or a remedy as set out in the final policy.</p>,
  },
  {
    id: "conduct",
    title: "Traveller conduct",
    body: <p>We may remove a traveller whose behaviour endangers or disturbs the group.</p>,
  },
  {
    id: "liability",
    title: "Liability",
    body: <p>To the extent permitted by law, Indian Rounds is not liable for loss caused by third-party providers or events beyond our control. Travel insurance is recommended.</p>,
  },
  {
    id: "governing-law",
    title: "Governing law",
    body: <p>These terms are governed by the laws of India.</p>,
  },
  {
    id: "contact",
    title: "Contact us",
    body: <p>Questions about these terms? Reach our team through the <Link href="/contact">Contact page</Link>.</p>,
  },
];

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms &"
      accent="Conditions"
      intro="These terms govern use of the Indian Rounds website and the tours we organise."
      path="/terms"
      draft
      numbered
      highlights={[
        { icon: CalendarCheck, title: "Confirmed on payment", text: "A booking is confirmed after the advance payment and a written confirmation." },
        { icon: BadgeIndianRupee, title: "Per person, in rupees", text: "Prices are per person in INR. GST and other taxes are added at checkout." },
        { icon: ShieldAlert, title: "Insurance is advised", text: "Travel insurance is recommended for every traveller." },
      ]}
      sections={sections}
    />
  );
}
