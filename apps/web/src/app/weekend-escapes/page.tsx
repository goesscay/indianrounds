import type { Metadata } from "next";
import { CalendarCheck, Luggage, PlaneTakeoff, Sparkles, Users, Wallet } from "lucide-react";
import { getDepartures, getMenuCountries } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { MENUS } from "@/lib/menus";
import { CoverImage } from "@/components/CoverImage";
import { WeekendExplorer } from "@/components/departures/WeekendExplorer";
import { PlaceCard } from "@/components/home/HomeParts";
import { Rail } from "@/components/home/Rail";
import { Reveal } from "@/components/home/Reveal";
import { OpenQuoteButton } from "@/components/LeadModal";
import { Breadcrumbs } from "@/components/MenuViews";
import { SectionHeading } from "@/components/SectionHeading";

export const revalidate = 60;

export const metadata: Metadata = {
  title: MENUS["weekend-escapes"].title,
  description: "Weekend getaways with fixed Friday departures: short breaks in India and abroad, planned so you are back for Monday. Filter by budget, duration and destination.",
  alternates: { canonical: "/weekend-escapes" },
};

const why = [
  { icon: CalendarCheck, title: "Little or no leave", text: "Trips leave on a Friday and are planned around a long weekend, so you spend your weekend, not your leave balance." },
  { icon: Wallet, title: "Easy on the budget", text: "Short stays keep the cost down, and the inclusions are spelled out on every trip so there are no surprises." },
  { icon: Users, title: "A group and a trip captain", text: "You travel on a fixed departure with other travellers and a trip captain who looks after the plan." },
  { icon: Sparkles, title: "Everything planned", text: "Stay, transfers and the main sights are arranged, so you only have to pack and turn up on time." },
];

const steps = [
  { icon: Luggage, title: "Pick a Friday", text: "Choose a trip and a departure date that suits your calendar." },
  { icon: PlaneTakeoff, title: "Reach early on day 1", text: "Fly or take a train that lands in the morning so no sightseeing is lost." },
  { icon: Sparkles, title: "Two or three full days", text: "Follow the plan with your trip captain, with free time built in." },
  { icon: CalendarCheck, title: "Home for Monday", text: "A late departure on the last day gets you back for the week ahead." },
];

const faqs = [
  { q: "What is a weekend getaway?", a: "A short fixed-departure trip of two or three nights, usually leaving on a Friday, planned so you can be back for Monday with little or no leave." },
  { q: "Are flights or train tickets included?", a: "No. The price covers the stay, transfers and sightseeing in the itinerary. You book your own flights or trains to the starting point, and we can help you pick timings that make the most of the trip." },
  { q: "Do I need a visa?", a: "India trips need no visa. For international weekend trips, visa requirements depend on the country and change from time to time, so we tell you what applies when you enquire." },
  { q: "Who travels on these trips?", a: "Friends, couples and solo travellers join the same fixed departure, with a trip captain looking after the group. You can also enquire for a private group." },
  { q: "What if my plans change?", a: "Cancellation and refund rules are in our Terms and Conditions and confirmed when you book. If the dates do not work, ask us about another departure." },
  { q: "Can I customise a weekend trip?", a: "Yes. Tell us what you would like to change, such as the stay, the pace or the dates, and we will plan it as a private trip." },
];

export default async function WeekendEscapesPage() {
  const [trips, countries] = await Promise.all([getDepartures("weekend"), getMenuCountries("weekend-escapes")]);
  const prices = trips.map((t) => t.price).filter((p): p is number => p !== null);
  const from = prices.length ? Math.min(...prices) : null;
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10">
          <CoverImage src="/photos/places/united-arab-emirates/burj-khalifa.jpg" alt="" seed="weekend-escapes" className="h-full w-full" sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/50 to-black/20" aria-hidden />
        <div className="mx-auto flex min-h-[18rem] max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:min-h-[22rem] lg:px-8">
          <Breadcrumbs items={[{ label: "Weekend Escapes" }]} />
          <h1 className="text-4xl font-extrabold sm:text-6xl">Weekend <span className="text-brand-red">Getaways</span></h1>
          <p className="mt-3 max-w-xl text-white/90 sm:text-lg">Fly out on Friday, be back for Monday. Short breaks in India and abroad with a trip captain and everything arranged.</p>
          <ul className="mt-4 flex flex-wrap gap-2 text-sm">
            <li className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur">2 to 3 nights</li>
            <li className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur">Friday departures</li>
            {from !== null && <li className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur">From {formatINR(from)} per person</li>}
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="#trips" className="rounded-full bg-brand-red px-6 py-3 font-semibold text-white shadow-lg hover:bg-brand-red-dark">See weekend trips</a>
            <OpenQuoteButton className="rounded-full border border-white/70 px-6 py-3 font-semibold hover:bg-white hover:text-brand-red">Request a callback</OpenQuoteButton>
          </div>
        </div>
      </section>

      <div id="trips" className="scroll-mt-32">
        {trips.length > 0 ? (
          <WeekendExplorer trips={trips} />
        ) : (
          <div className="mx-auto max-w-3xl px-4 py-20 text-center">
            <h2 className="text-2xl font-extrabold">New weekend departures are coming</h2>
            <p className="mt-2 text-muted">Tell us where you would like to go this weekend and we will plan it.</p>
            <div className="mt-6"><OpenQuoteButton className="rounded-full bg-brand-red px-7 py-3 font-semibold text-white hover:bg-brand-red-dark">Get a Free Quote</OpenQuoteButton></div>
          </div>
        )}
      </div>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <Reveal><SectionHeading lead="Why weekend trips" accent="work" sub="A real trip, without waiting for a long holiday" /></Reveal>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {why.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <Reveal delay={i * 80} className="h-full">
                <div className="h-full rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:shadow-float">
                  <span className="grid size-12 place-items-center rounded-full bg-brand-red/10 text-brand-red"><Icon size={24} aria-hidden /></span>
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-amber-50/70">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <Reveal><SectionHeading lead="How a weekend trip" accent="runs" sub="From Friday to Monday in four steps" /></Reveal>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative rounded-2xl bg-white p-6 shadow-sm">
                <span className="absolute right-5 top-4 text-5xl font-extrabold text-black/5" aria-hidden>{i + 1}</span>
                <span className="grid size-11 place-items-center rounded-full bg-brand-red text-white"><Icon size={22} aria-hidden /></span>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-16">
        <SectionHeading lead="Weekend getaway" accent="FAQs" sub="Quick answers before you book" />
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
      </section>

      {countries.length > 0 && (
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <SectionHeading lead="Browse weekend trips by" accent="Country" sub="See every weekend category for a destination" />
            <Rail label="Weekend getaway countries">
              {countries.map((c) => <PlaceCard key={c.slug} href={`/weekend-escapes/${c.slug}`} place={c} />)}
            </Rail>
          </div>
        </section>
      )}

      <section className="bg-gradient-to-r from-brand-red-dark to-brand-red text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-3xl font-extrabold">Do not just dream, go this weekend</h2>
            <p className="mt-1 text-sm text-white/85">Tell us where and when. Our travel experts will get back to you.</p>
          </div>
          <OpenQuoteButton className="rounded-full bg-white px-8 py-3.5 font-semibold text-brand-red hover:bg-white/90">Enquire now</OpenQuoteButton>
        </div>
      </section>
    </>
  );
}
