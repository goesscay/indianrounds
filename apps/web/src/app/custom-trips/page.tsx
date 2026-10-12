import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Compass, Mail, MessageCircle, MessageSquareText, Phone, ShieldCheck, Sparkles, Users, Wallet } from "lucide-react";
import { getTours } from "@/lib/api";
import { site } from "@/lib/site";
import { CoverImage } from "@/components/CoverImage";
import { EnquiryForm } from "@/components/EnquiryForm";
import { Rail } from "@/components/home/Rail";
import { Reveal } from "@/components/home/Reveal";
import { Breadcrumbs } from "@/components/MenuViews";
import { SectionHeading } from "@/components/SectionHeading";
import { TourCard } from "@/components/TourCard";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Custom Trips",
  description: "Tell us where, when and how you like to travel and our team designs a personalised itinerary for you: family holidays, friends' trips, honeymoons and group outings.",
  alternates: { canonical: "/custom-trips" },
};

const kinds = [
  { title: "Family holidays", text: "Easy pacing, kid-friendly stays and something for every age.", img: "/photos/places/kerala/alleppey-houseboat.jpg" },
  { title: "Friends' getaways", text: "Adventure, beaches or road trips for your own crew.", img: "/photos/places/goa/baga-calangute-beach.jpg" },
  { title: "Honeymoons & anniversaries", text: "Romantic stays and quiet moments planned for two.", img: "/photos/places/morocco/chefchaouen-blue-city.jpg" },
  { title: "Corporate & large groups", text: "Offsites, reunions and school or society tours.", img: "/photos/places/rajasthan/amber-fort-jaipur.jpg" },
];

const steps = [
  { icon: MessageSquareText, title: "Tell us your idea", text: "Who is travelling, where you would like to go and roughly when." },
  { icon: Compass, title: "We design it", text: "A travel designer builds a day-by-day plan around your pace and interests." },
  { icon: Sparkles, title: "Refine it together", text: "Swap hotels, add experiences, change the pace until it feels right." },
  { icon: Wallet, title: "Confirm and go", text: "Pay securely online and travel with our team on call." },
];

const why = [
  { icon: Users, title: "A real person plans it", text: "One travel designer stays with you from first idea to return home." },
  { icon: ShieldCheck, title: "Clear, honest pricing", text: "You see what is included and what is not before you pay." },
  { icon: Clock, title: "A first draft in a day", text: "Send your details and expect an itinerary and price quickly." },
];

const faqs = [
  { q: "How much does a custom trip cost?", a: "It depends on the destination, season, hotels and group size. Share your budget and we will design the best trip we can within it." },
  { q: "How soon will I hear back?", a: "Our team usually replies within one working day with questions or a first draft." },
  { q: "Can I change the plan after I see it?", a: "Yes. Drafts are meant to be changed, and there is no charge for revisions before you confirm." },
  { q: "Do you handle visas and flights?", a: "We guide you through visa paperwork and can help choose flights. Both are priced separately unless the quote says otherwise." },
];

export default async function CustomTripsPage() {
  const ideas = await getTours({ type: "custom", per_page: "12" });
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Hi, I'd like help planning a custom trip.")}`;
  const contact = [
    { icon: Phone, label: "Call us", value: site.phone, href: site.phoneHref },
    { icon: MessageCircle, label: "WhatsApp", value: "Chat with a designer", href: wa },
    { icon: Mail, label: "Email", value: site.email, href: `mailto:${site.email}` },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10">
          <CoverImage src="/photos/places/morocco/chefchaouen-blue-city.jpg" alt="" seed="custom-trips" className="h-full w-full" sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/55 to-black/10" aria-hidden />
        <div className="mx-auto flex min-h-[22rem] max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:min-h-[28rem] lg:px-8">
          <Breadcrumbs items={[{ label: "Custom Trips" }]} />
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-amber-300"><Compass size={16} aria-hidden /> Personalised experiences</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">A trip built <span className="text-amber-300">just for you</span></h1>
          <p className="mt-3 max-w-xl text-white/90 sm:text-lg">Can&apos;t find the right departure? Tell us your idea and a travel designer will plan it from scratch, around your dates, budget and pace.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#design" className="rounded-full bg-brand-red px-6 py-3 font-semibold text-white shadow-lg hover:bg-brand-red-dark">Design my trip</a>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/70 px-6 py-3 font-semibold hover:bg-white hover:text-ink">Chat on WhatsApp</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <Reveal><SectionHeading lead="What we can" accent="plan" sub="Whatever the occasion, the trip is built around the people travelling" /></Reveal>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kinds.map((k, i) => (
            <li key={k.title}>
              <Reveal delay={i * 80} className="h-full">
                <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-ink text-white shadow-sm">
                  <div className="absolute inset-0 transition duration-500 group-hover:scale-105">
                    <CoverImage src={k.img} alt="" seed={k.title} className="h-full w-full" sizes="(min-width: 1024px) 25vw, 50vw" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" aria-hidden />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="text-lg font-extrabold leading-tight">{k.title}</h3>
                    <p className="mt-1 hidden text-sm text-white/85 sm:block">{k.text}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-surface-alt">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <Reveal><SectionHeading lead="How it" accent="works" sub="From first idea to boarding pass in four simple steps" /></Reveal>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title}>
                <Reveal delay={i * 90} className="h-full">
                  <div className="relative h-full rounded-2xl bg-white p-6 shadow-sm">
                    <span className="absolute right-4 top-2 text-5xl font-extrabold text-brand-red/10" aria-hidden>{i + 1}</span>
                    <span className="grid size-12 place-items-center rounded-full bg-brand-red/10 text-brand-red"><Icon size={24} aria-hidden /></span>
                    <h3 className="mt-4 font-bold">{title}</h3>
                    <p className="mt-1 text-sm text-muted">{text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {ideas.data.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <Reveal><SectionHeading lead="Need some" accent="inspiration?" sub="Private packages you can take as they are or change to suit you" href="/tours?type=custom" cta="See all" /></Reveal>
          <Rail label="Private package ideas">
            {ideas.data.map((t) => (
              <li key={t.slug} className="w-72 shrink-0 snap-start"><TourCard tour={t} /></li>
            ))}
          </Rail>
        </section>
      )}

      <section className="bg-gradient-to-br from-ink to-brand-red-dark text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <Reveal><h2 className="text-3xl font-extrabold sm:text-4xl">Why plan with <span className="text-amber-300">Indian Rounds</span></h2></Reveal>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {why.map(({ icon: Icon, title, text }, i) => (
              <li key={title}>
                <Reveal delay={i * 90} className="h-full">
                  <div className="h-full rounded-2xl bg-white/10 p-6 backdrop-blur">
                    <span className="grid size-12 place-items-center rounded-full bg-white/15 text-amber-300"><Icon size={24} aria-hidden /></span>
                    <h3 className="mt-4 text-lg font-bold">{title}</h3>
                    <p className="mt-1 text-sm text-white/85">{text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="design" className="scroll-mt-32 mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Design <span className="text-brand-red">My Trip</span></h2>
            <p className="mt-2 text-muted">A few details help us get the first draft right. Prefer to talk? Reach us any way you like.</p>
            <ul className="mt-6 space-y-3">
              {contact.map(({ icon: Icon, label, value, href }) => (
                <li key={label}>
                  <a href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-4 transition hover:border-brand-red hover:shadow-float">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red"><Icon size={20} aria-hidden /></span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
                      <span className="block truncate font-bold">{value}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">{site.hours}</p>
            <p className="mt-6 text-sm">Would you rather join a fixed departure? <Link href="/group-tours" className="font-semibold text-brand-red hover:underline">See group tours</Link>.</p>
          </div>
          <div className="rounded-card bg-white p-6 shadow-float sm:p-8">
            <EnquiryForm kind="custom" />
          </div>
        </div>
      </section>

      <section className="bg-surface-alt">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-16">
          <SectionHeading lead="Custom trip" accent="FAQs" sub="Quick answers before you enquire" />
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
