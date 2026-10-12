import type { Metadata } from "next";
import { CandlestickChart, Car, Flower2, HeartHandshake, Hotel, Route, Sparkles, Waves } from "lucide-react";
import { getMenuCountries, getTours } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { MENUS } from "@/lib/menus";
import { CoverImage } from "@/components/CoverImage";
import { PlaceCard, RailSection } from "@/components/home/HomeParts";
import { Rail } from "@/components/home/Rail";
import { Reveal } from "@/components/home/Reveal";
import { OpenQuoteButton } from "@/components/LeadModal";
import { Breadcrumbs } from "@/components/MenuViews";
import { SectionHeading } from "@/components/SectionHeading";
import { TourCard } from "@/components/TourCard";

export const revalidate = 60;

export const metadata: Metadata = {
  title: MENUS.honeymoon.title,
  description: "Private honeymoon packages in India and abroad: romantic stays, candlelit dinners, couple time and unhurried itineraries planned for two.",
  alternates: { canonical: "/honeymoon" },
};

const touches = [
  { icon: Flower2, title: "A romantic welcome", text: "Flowers, a cake or a decorated room waiting on arrival, where the stay allows." },
  { icon: CandlestickChart, title: "Candlelit dinner", text: "One special dinner for two, planned into the trip." },
  { icon: Waves, title: "Couple time", text: "A couples spa or a quiet sunset, depending on the destination." },
  { icon: Car, title: "Private transfers", text: "Your own car and a relaxed pace, not a coach and a schedule." },
  { icon: Hotel, title: "Stays made for two", text: "Villas, riads, houseboats and sea-view rooms suited to couples." },
  { icon: Sparkles, title: "One big moment", text: "A signature experience: a sunset cruise, a desert dinner, a rice-terrace swing." },
];

const steps = [
  { n: 1, title: "Tell us your dream", text: "Where, when and the kind of honeymoon you imagine." },
  { n: 2, title: "Get a plan for two", text: "A day-by-day itinerary and price, tweaked until it feels right." },
  { n: 3, title: "Share your wedding date", text: "So the hotels can arrange a little something special." },
  { n: 4, title: "Go and enjoy", text: "We stay on call while you enjoy every unhurried day." },
];

const faqs = [
  { q: "Are honeymoon trips private?", a: "Yes. They are private couple trips with a fixed day-by-day itinerary, not group departures. You choose the dates and we confirm the price when you enquire." },
  { q: "What honeymoon extras are included?", a: "Typically a romantic welcome, one candlelit dinner and private transfers, with a couples spa or a signature experience where the destination suits it. Each package lists its inclusions, and extras are subject to availability and hotel policy." },
  { q: "Do I need to share my marriage certificate?", a: "We ask for your wedding date or marriage certificate when you book so the hotel can arrange the welcome. It is also needed for some stays and offers." },
  { q: "Are flights included?", a: "No. Prices cover the stay, transfers and sightseeing in the itinerary. We can help you choose flights and timings that make the most of the trip." },
  { q: "Can we change the itinerary?", a: "Yes. Every honeymoon package is a starting point. Tell us what you would like to change, such as the hotel, the pace or the cities, and we will rework it." },
  { q: "When is the best time to go?", a: "It depends on the destination, and each destination page shows its on, mid and off seasons so you can pick the right months for the place you choose." },
];

export default async function HoneymoonPage() {
  const [countries, picks] = await Promise.all([getMenuCountries("honeymoon"), getTours({ tag: "couples", per_page: "12" })]);
  const india = countries.filter((c) => c.region === "india");
  const abroad = countries.filter((c) => c.region !== "india");
  const from = countries.map((c) => c.menu_starting_price).filter((p): p is number => p !== null);
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10">
          <CoverImage src="/photos/places/indonesia/bali-swing-ubud.jpg" alt="" seed="honeymoon" className="h-full w-full" sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-rose-950/85 via-rose-900/55 to-black/10" aria-hidden />
        <div className="mx-auto flex min-h-[22rem] max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:min-h-[28rem] lg:px-8">
          <Breadcrumbs items={[{ label: "Honeymoon" }]} />
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-rose-200"><HeartHandshake size={16} aria-hidden /> Made for two</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] sm:text-6xl">Honeymoon <span className="text-rose-300">Packages</span></h1>
          <p className="mt-3 max-w-xl text-white/90 sm:text-lg">Private, unhurried trips with candlelit dinners, couple time and views worth the journey. Begin your forever beautifully.</p>
          <ul className="mt-5 flex flex-wrap gap-2 text-sm">
            <li className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur">Private trips</li>
            <li className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur">India and abroad</li>
            {from.length > 0 && <li className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur">From {formatINR(Math.min(...from))} per person</li>}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#destinations" className="rounded-full bg-rose-500 px-6 py-3 font-semibold text-white shadow-lg hover:bg-rose-600">Choose a destination</a>
            <OpenQuoteButton options={{ title: "Plan my honeymoon", message: "I'd like help planning a honeymoon." }} className="rounded-full border border-white/70 px-6 py-3 font-semibold hover:bg-white hover:text-rose-700">Plan my honeymoon</OpenQuoteButton>
          </div>
        </div>
      </section>

      <div id="destinations" className="scroll-mt-32">
        {abroad.length > 0 && (
          <RailSection tone="rose" kicker="Overseas" lead="Honeymoon" accent="Abroad" blurb="Beach villas, desert nights, mountain towns and old cities. Pick a country and see its honeymoon trips." href="/explore-the-world" cta="Explore the World" label="Honeymoon destinations abroad">
            {abroad.map((c) => <PlaceCard key={c.slug} href={`/honeymoon/${c.slug}`} place={c} />)}
          </RailSection>
        )}
        {india.length > 0 && (
          <RailSection tone="light" kicker="Closer to home" lead="Honeymoon in" accent="India" blurb="Houseboats, palaces, hill stations and islands, without the long flight." href="/explore-india" cta="Explore India" label="Honeymoon destinations in India">
            {india.map((c) => <PlaceCard key={c.slug} href={`/honeymoon/${c.slug}`} place={c} />)}
          </RailSection>
        )}
      </div>

      {picks.data.length > 0 && (
        <section className="bg-rose-50/60">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
            <Reveal><SectionHeading lead="Popular honeymoon" accent="Packages" sub="Ready-made trips you can change to suit the two of you" href="/tours?tag=couples" cta="See all" /></Reveal>
            <Rail label="Popular honeymoon packages">
              {picks.data.map((t) => (
                <li key={t.slug} className="w-72 shrink-0 snap-start"><TourCard tour={t} showSaving /></li>
              ))}
            </Rail>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <Reveal><SectionHeading lead="Little touches that make it" accent="special" sub="Included where the destination and the stay allow, and always subject to availability" /></Reveal>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {touches.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <Reveal delay={(i % 3) * 80} className="h-full">
                <div className="h-full rounded-2xl border border-rose-100 bg-white p-6 transition hover:-translate-y-1 hover:shadow-float">
                  <span className="grid size-12 place-items-center rounded-full bg-rose-100 text-rose-600"><Icon size={24} aria-hidden /></span>
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-gradient-to-br from-rose-900 to-rose-700 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <Reveal>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-rose-200"><Route size={16} aria-hidden /> Planning made easy</p>
            <h2 className="mt-2 max-w-xl text-3xl font-extrabold sm:text-4xl">Plan your honeymoon in four steps</h2>
          </Reveal>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.n}>
                <Reveal delay={i * 90} className="h-full">
                  <div className="relative h-full rounded-2xl bg-white/10 p-6 backdrop-blur">
                    <span className="text-5xl font-extrabold text-white/20" aria-hidden>{s.n}</span>
                    <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                    <p className="mt-1 text-sm text-white/85">{s.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-16">
        <SectionHeading lead="Honeymoon" accent="FAQs" sub="Quick answers before you plan" />
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <details key={f.q} open={i === 0} className="group rounded-card border border-black/10 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-bold marker:hidden [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="text-rose-600 transition group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="border-t border-black/10 px-5 py-4 text-sm leading-relaxed text-ink/85">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-r from-rose-800 to-brand-red text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-3xl font-extrabold">Let us plan your honeymoon</h2>
            <p className="mt-1 text-sm text-white/85">Share your dates and dream destination. We will send a plan for two.</p>
          </div>
          <OpenQuoteButton options={{ title: "Plan my honeymoon", message: "I'd like help planning a honeymoon." }} className="rounded-full bg-white px-8 py-3.5 font-semibold text-rose-700 hover:bg-white/90">Get a Free Quote</OpenQuoteButton>
        </div>
      </section>
    </>
  );
}
