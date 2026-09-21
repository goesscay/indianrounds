import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { site } from "@/lib/site";
import { LeadForm } from "@/components/LeadForm";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Talk to an Indian Rounds travel expert or send us your trip requirements.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PageShell title="Contact" accent="Us" intro="Questions about a tour or a booking? Send us a message and our team will get back to you.">
      <div className="grid gap-8 md:grid-cols-[1fr_1.2fr]">
        <ul className="space-y-4 text-sm [&_li]:m-0 [&_li]:list-none">
          <li className="flex gap-3"><Phone size={20} className="mt-0.5 text-brand-red" /><a href={site.phoneHref}>{site.phone}</a></li>
          <li className="flex gap-3"><Mail size={20} className="mt-0.5 text-brand-red" /><a href={`mailto:${site.email}`}>{site.email}</a></li>
          <li className="flex gap-3"><MapPin size={20} className="mt-0.5 text-brand-red" />{site.address}</li>
          <li className="flex gap-3"><Clock size={20} className="mt-0.5 text-brand-red" />{site.hours}</li>
        </ul>
        <div className="rounded-card border border-black/10 p-5">
          <h2 className="!mt-0 mb-3">Send us a message</h2>
          <LeadForm source="contact" />
        </div>
      </div>
    </PageShell>
  );
}
