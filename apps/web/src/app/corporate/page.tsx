import type { Metadata } from "next";
import { Building2, Compass, Handshake, PartyPopper, ShieldCheck, Users } from "lucide-react";
import { getCaseStudies } from "@/lib/api";
import { EnquiryForm } from "@/components/EnquiryForm";
import { SectionHeading } from "@/components/SectionHeading";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Corporate Travel, Offsites & MICE",
  description: "Team offsites, conferences, dealer meets and rewards trips — planned end to end by Indian Rounds.",
  alternates: { canonical: "/corporate" },
};

const offerings = [
  { icon: Users, title: "Team outings & offsites", text: "Retreats that mix work sessions with time to actually connect." },
  { icon: Building2, title: "Conferences & MICE", text: "Venues, delegate travel, stays and on-ground coordination." },
  { icon: PartyPopper, title: "Rewards & recognition", text: "Incentive trips your top performers will talk about for years." },
  { icon: Handshake, title: "Dealer & partner meets", text: "Hosted events that strengthen relationships with your network." },
  { icon: Compass, title: "Custom programmes", text: "Team-building activities, experiences and itineraries built around your goals." },
  { icon: ShieldCheck, title: "One accountable team", text: "A dedicated manager and a Tour Manager on the ground for the whole trip." },
];

export default async function CorporatePage() {
  const cases = await getCaseStudies();

  return (
    <>
      <section className="bg-gradient-to-r from-brand-red-dark to-brand-red text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">Indian Rounds for business</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">Corporate travel, offsites &amp; MICE — planned end to end</h1>
          <p className="mt-3 max-w-2xl text-white/85">From five people to five hundred. Tell us the goal; we handle the venues, travel, stays, activities and on-ground support.</p>
          <a href="#quote" className="mt-6 inline-block rounded-full bg-white px-7 py-3 font-semibold text-brand-red hover:bg-white/90">Request a quote</a>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeading lead="What we" accent="Plan" />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {offerings.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-card bg-white p-6 shadow-float">
              <span className="grid size-12 place-items-center rounded-full bg-brand-red/10 text-brand-red"><Icon size={24} /></span>
              <h3 className="mt-4 font-bold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {cases.length > 0 && (
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <SectionHeading lead="Trips we've" accent="Delivered" sub="A few recent corporate programmes" />
            <div className="grid gap-5 md:grid-cols-3">
              {cases.map((c) => (
                <article key={c.id} className="flex flex-col rounded-card bg-white p-6 shadow-float">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">{c.destination} · {c.headcount} people</p>
                  <h3 className="mt-1 font-bold">{c.client_name}</h3>
                  <p className="mt-2 text-sm text-muted">{c.blurb}</p>
                  {c.quote && (
                    <blockquote className="mt-4 border-l-4 border-brand-red pl-3 text-sm italic">
                      “{c.quote}”
                      {(c.quote_name || c.quote_title) && <footer className="mt-1 text-xs not-italic text-muted">{[c.quote_name, c.quote_title].filter(Boolean).join(", ")}</footer>}
                    </blockquote>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="quote" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-14 sm:px-6">
        <SectionHeading lead="Request a" accent="Corporate Quote" sub="Our corporate team replies within one working day." />
        <div className="rounded-card bg-white p-6 shadow-float sm:p-8">
          <EnquiryForm kind="corporate" />
        </div>
      </section>
    </>
  );
}
