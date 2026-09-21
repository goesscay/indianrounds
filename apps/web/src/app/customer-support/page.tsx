import type { Metadata } from "next";
import { site } from "@/lib/site";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Customer Support & Grievance Redressal", alternates: { canonical: "/customer-support" } };

export default function CustomerSupportPage() {
  return (
    <PageShell title="Customer" accent="Support" draft intro="If something goes wrong with your trip or booking, here is how to reach us and how we escalate.">
      <h2>How to raise a complaint</h2>
      <p>Email <a className="text-brand-red underline" href={`mailto:${site.email}`}>{site.email}</a> or call <a className="text-brand-red underline" href={site.phoneHref}>{site.phone}</a> ({site.hours}). Please include your booking reference.</p>
      <h2>Escalation stages</h2>
      <ul>
        <li><strong>Stage 1 — Support team:</strong> acknowledgement and first response. Officer names, contacts and timelines to be confirmed.</li>
        <li><strong>Stage 2 — Escalation officer:</strong> reviews unresolved cases. Details to be confirmed.</li>
        <li><strong>Stage 3 — Head of grievance redressal:</strong> final review. Details to be confirmed.</li>
      </ul>
      <p>Named officers, response timelines and statutory references will be published here once provided by Indian Rounds.</p>
    </PageShell>
  );
}
