import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Terms & Conditions", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <PageShell title="Terms &" accent="Conditions" draft intro="These terms govern use of the Indian Rounds website and the tours we organise.">
      <h2>1. Who we are</h2>
      <p>Indian Rounds organises group and customised tours. We coordinate services delivered by independent third parties such as hotels, transport operators and local guides.</p>
      <h2>2. Bookings</h2>
      <p>A booking is confirmed only after the required advance payment is received and a written confirmation is issued. You must provide accurate traveller details, including a valid government photo ID or passport.</p>
      <h2>3. Prices</h2>
      <ul>
        <li>Prices are per person and shown in Indian Rupees.</li>
        <li>GST and other applicable taxes are added at checkout.</li>
        <li>Prices may change until a booking is confirmed.</li>
      </ul>
      <h2>4. Payments</h2>
      <p>The payment schedule for each tour is shown at checkout. Missing a due payment may lead to cancellation of the booking.</p>
      <h2>5. Cancellations and refunds</h2>
      <p>The cancellation and refund schedule will be published here once finalised by Indian Rounds.</p>
      <h2>6. Changes to a tour</h2>
      <p>Itineraries may change because of weather, road conditions, permits or safety. Where we cancel a tour we will offer an alternative or a remedy as set out in the final policy.</p>
      <h2>7. Traveller conduct</h2>
      <p>We may remove a traveller whose behaviour endangers or disturbs the group.</p>
      <h2>8. Liability</h2>
      <p>To the extent permitted by law, Indian Rounds is not liable for loss caused by third-party providers or events beyond our control. Travel insurance is recommended.</p>
      <h2>9. Governing law</h2>
      <p>These terms are governed by the laws of India.</p>
    </PageShell>
  );
}
