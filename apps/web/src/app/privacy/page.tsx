import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Lock, UserCheck } from "lucide-react";
import { LegalLayout, type LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Indian Rounds collects, uses and shares your personal information, and how you can access, correct or delete it.",
  alternates: { canonical: "/privacy" },
};

const sections: LegalSection[] = [
  {
    id: "information-we-collect",
    title: "Information we collect",
    body: (
      <ul>
        <li>Contact details you submit in enquiry, callback and contact forms (name, phone, email, destination, travel dates).</li>
        <li>Booking and traveller details needed to organise your trip.</li>
        <li>Basic usage data such as pages visited, to improve the site.</li>
      </ul>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use it",
    body: <p>To respond to enquiries, process bookings and payments, arrange services with our travel partners, and send service updates. We only send marketing messages where you have agreed.</p>,
  },
  {
    id: "sharing",
    title: "Sharing",
    body: <p>We share the minimum details needed with hotels, transport providers, payment processors and authorities (for example for permits). We do not sell personal data.</p>,
  },
  {
    id: "payments",
    title: "Payments",
    body: <p>Card, UPI and bank details are handled by our payment processor and are not stored on our servers.</p>,
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: <p>You can ask us to access, correct or delete your information by writing to the address on our <Link href="/contact">Contact page</Link>.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy"
      accent="Policy"
      intro="How Indian Rounds collects and uses your personal information."
      path="/privacy"
      draft
      highlights={[
        { icon: UserCheck, title: "Only what we need", text: "We collect the details needed to answer enquiries and organise your trip." },
        { icon: Lock, title: "We do not sell your data", text: "We share the minimum details with partners who deliver your trip." },
        { icon: CreditCard, title: "Payments stay with the processor", text: "Card, UPI and bank details are not stored on our servers." },
      ]}
      sections={sections}
    />
  );
}
