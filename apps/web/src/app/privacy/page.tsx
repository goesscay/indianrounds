import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy" accent="Policy" draft intro="How Indian Rounds collects and uses your personal information.">
      <h2>Information we collect</h2>
      <ul>
        <li>Contact details you submit in enquiry, callback and contact forms (name, phone, email, destination, travel dates).</li>
        <li>Booking and traveller details needed to organise your trip.</li>
        <li>Basic usage data such as pages visited, to improve the site.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To respond to enquiries, process bookings and payments, arrange services with our travel partners, and send service updates. We only send marketing messages where you have agreed.</p>
      <h2>Sharing</h2>
      <p>We share the minimum details needed with hotels, transport providers, payment processors and authorities (for example for permits). We do not sell personal data.</p>
      <h2>Payments</h2>
      <p>Card, UPI and bank details are handled by our payment processor and are not stored on our servers.</p>
      <h2>Your rights</h2>
      <p>You can ask us to access, correct or delete your information by writing to the address on our Contact page.</p>
    </PageShell>
  );
}
