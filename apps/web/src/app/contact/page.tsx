import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase, CalendarCheck, Clock, Compass, Headset, Mail, MapPin, MessageCircle, Phone, Users } from "lucide-react";
import { site } from "@/lib/site";
import { CoverImage } from "@/components/CoverImage";
import { LeadForm } from "@/components/LeadForm";
import { Breadcrumbs } from "@/components/MenuViews";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Talk to an Indian Rounds travel expert by phone, WhatsApp or email, visit our Chennai office, or send us your trip requirements.",
  alternates: { canonical: "/contact" },
};

const topics = [
  { href: "/custom-trips", icon: Compass, title: "Plan a custom trip", text: "Tell us your idea and we will design it." },
  { href: "/group-tours", icon: Users, title: "Join a group tour", text: "Browse fixed departures and dates." },
  { href: "/bookings", icon: CalendarCheck, title: "Manage a booking", text: "Check payments and trip details." },
  { href: "/corporate", icon: Briefcase, title: "Corporate and groups", text: "Offsites, incentives and large groups." },
  { href: "/customer-support", icon: Headset, title: "Customer support", text: "Help with an existing enquiry." },
];

const faqs = [
  { q: "How quickly will you reply?", a: "Our team usually replies within one working day. For anything urgent, call or message us on WhatsApp during office hours." },
  { q: "Can I speak to someone before I book?", a: "Yes. Call us or start a WhatsApp chat and a travel expert will help you compare trips and dates, with no obligation." },
  { q: "I want a trip that is not on the website. Can you plan it?", a: "Yes. Share where you would like to go, when and roughly what you would like to spend, and we will design an itinerary around you." },
  { q: "Where can I see my booking?", a: "Open My Bookings from the top of the site and sign in. You will find your trip details and payment status there." },
];

export default function ContactPage() {
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Hi Indian Rounds, I'd like some help with a trip.")}`;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.name}, ${site.address}`)}`;
  const channels = [
    { icon: Phone, label: "Call us", value: site.phone, note: site.hours, href: site.phoneHref },
    { icon: MessageCircle, label: "WhatsApp", value: "Chat with a travel expert", note: "Quick answers during office hours", href: wa, external: true },
    { icon: Mail, label: "Email", value: site.email, note: "We reply within one working day", href: `mailto:${site.email}` },
    { icon: MapPin, label: "Visit us", value: "Chennai office", note: "Get directions on Google Maps", href: maps, external: true },
  ];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      name: site.name,
      url: site.url,
      telephone: site.phone,
      email: site.email,
      address: { "@type": "PostalAddress", streetAddress: "13/8 EKR Avenue, Yathavar Street, Kovur, Irandam Kattalai", addressLocality: "Chennai", addressRegion: "Tamil Nadu", postalCode: "600128", addressCountry: "IN" },
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10">
          <CoverImage src="/photos/places/kerala/munnar-tea-plantations.jpg" alt="" seed="contact" className="h-full w-full" sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/60 to-black/25" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8 lg:pb-28 lg:pt-14">
          <Breadcrumbs items={[{ label: "Contact Us" }]} />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">We would love to hear from you</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Contact <span className="text-amber-300">Us</span></h1>
          <p className="mt-3 max-w-xl text-white/90 sm:text-lg">Questions about a tour, a booking or a trip you have in mind? Our travel experts are a call, a message or a visit away.</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm backdrop-blur"><Clock size={15} aria-hidden /> We usually reply within one working day</p>
        </div>
      </section>

      <div className="mx-auto -mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map(({ icon: Icon, label, value, note, href, external }) => (
            <li key={label}>
              <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="group flex h-full flex-col rounded-2xl bg-white p-5 shadow-float ring-1 ring-black/5 transition hover:-translate-y-1">
                <span className="grid size-12 place-items-center rounded-xl bg-brand-red/10 text-brand-red transition group-hover:bg-brand-red group-hover:text-white"><Icon size={22} aria-hidden /></span>
                <span className="mt-4 text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
                <span className="mt-0.5 break-words font-bold">{value}</span>
                <span className="mt-1 text-sm text-muted">{note}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
          <div className="rounded-3xl bg-white p-6 shadow-float ring-1 ring-black/5 sm:p-8">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Send us a <span className="text-brand-red">message</span></h2>
            <p className="mt-1 text-sm text-muted">Share a few details and a travel expert will get back to you. Fields marked * are required.</p>
            <div className="mt-6">
              <LeadForm source="contact" />
            </div>
          </div>

          <aside className="space-y-5">
            <section aria-labelledby="office-h" className="rounded-3xl bg-gradient-to-br from-ink to-slate-800 p-6 text-white sm:p-8">
              <h2 id="office-h" className="text-xl font-extrabold">Our office</h2>
              <address className="mt-4 flex gap-3 text-sm not-italic leading-relaxed text-white/90">
                <MapPin size={20} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
                <span>{site.name}<br />{site.address}</span>
              </address>
              <p className="mt-4 flex gap-3 text-sm text-white/90"><Clock size={20} className="mt-0.5 shrink-0 text-amber-300" aria-hidden /> <span>{site.hours}</span></p>
              <a href={maps} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-ink hover:bg-white/90">Get directions <ArrowRight size={16} aria-hidden /></a>
            </section>

            <section aria-labelledby="topics-h" className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
              <h2 id="topics-h" className="text-xl font-extrabold">How can we help?</h2>
              <ul className="mt-4 divide-y divide-black/5">
                {topics.map(({ href, icon: Icon, title, text }) => (
                  <li key={href}>
                    <Link href={href} className="group flex items-center gap-3 py-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-alt text-brand-red"><Icon size={18} aria-hidden /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold group-hover:text-brand-red">{title}</span>
                        <span className="block text-xs text-muted">{text}</span>
                      </span>
                      <ArrowRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-brand-red" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </section>

      <section className="bg-surface-alt">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-16">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Before you <span className="text-brand-red">write</span></h2>
          <p className="mb-6 mt-1 text-sm text-muted">Quick answers to what we are asked most.</p>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details key={f.q} open={i === 0} className="group rounded-card border border-black/10 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-bold marker:hidden [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-brand-red transition group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="border-t border-black/10 px-5 py-4 text-sm leading-relaxed text-ink/85">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
