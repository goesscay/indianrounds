import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Eye, Globe2, Headset, HeartHandshake, MapPinned, Quote, ShieldCheck, Sparkles, Target, Users, Wallet } from "lucide-react";
import { getDestinations, getTours } from "@/lib/api";
import { CoverImage } from "@/components/CoverImage";
import { Reveal } from "@/components/home/Reveal";
import { OpenQuoteButton } from "@/components/LeadModal";
import { Breadcrumbs } from "@/components/MenuViews";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "About Us",
  description: "Indian Rounds makes travel simpler, more accessible and more meaningful: destination guidance, practical advice and tour packages for every budget, across India and the world.",
  alternates: { canonical: "/about" },
};

const services = [
  { icon: Compass, title: "Destination Discovery", text: "Explore destinations across India, Asia and beyond with information that helps you discover places suited to your interests and travel style." },
  { icon: MapPinned, title: "Domestic Tour Packages", text: "Discover experiences across India's diverse landscapes, from mountain escapes and beach holidays to heritage destinations and cultural journeys." },
  { icon: Globe2, title: "International Holidays", text: "Explore opportunities for international travel, from discovering vibrant cities to experiencing breathtaking natural wonders and new cultures." },
  { icon: Wallet, title: "Budget-Friendly Travel Options", text: "Find travel possibilities across different budgets, helping you plan a memorable holiday while making informed spending decisions." },
  { icon: Users, title: "Family, Group and Personal Travel", text: "Whether you are travelling with family, friends, a group, or planning a trip around your own interests, discover options to suit your journey." },
  { icon: Headset, title: "Travel Planning Assistance", text: "Get support in exploring suitable destinations, understanding package options, and planning the details of your next holiday." },
];

const reasons = [
  { title: "Travel for Every Budget", text: "We believe meaningful travel experiences can be found at different price points. Our aim is to help you explore options that align with your budget." },
  { title: "Explore With Confidence", text: "Access destination insights and practical travel information to make better-informed decisions before your journey begins." },
  { title: "Choices That Suit You", text: "Every traveller is different. We help you explore options based on your interests, travel preferences, companions and plans." },
  { title: "From Inspiration to Planning", text: "Move from discovering a destination to exploring tour packages and organising your next adventure with greater clarity." },
  { title: "Memories That Matter", text: "The best journeys are about more than places. They are about shared moments, new perspectives, and experiences you remember long after returning home." },
];

function Kicker({ n, children, light = false }: { n: string; children: string; light?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] ${light ? "text-amber-300" : "text-brand-red"}`}>
      <span className={`h-px w-8 ${light ? "bg-amber-300" : "bg-brand-red"}`} aria-hidden />
      {n} · {children}
    </p>
  );
}

export default async function AboutPage() {
  const [destinations, tours] = await Promise.all([getDestinations(), getTours({ per_page: "1" })]);
  const stats = [
    destinations.length > 0 && { value: String(destinations.length), label: "Destinations" },
    (tours.meta?.total ?? 0) > 0 && { value: String(tours.meta?.total), label: "Tour packages" },
    { value: "India & World", label: "Domestic and international" },
    { value: "Every budget", label: "Options to suit you" },
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <>
      {/* 1. Hero */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10">
          <CoverImage src="/photos/places/ladakh/pangong-tso-lake.jpg" alt="" seed="about" className="h-full w-full" sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/55 to-black/15" aria-hidden />
        <div className="mx-auto flex min-h-[26rem] max-w-7xl flex-col justify-center px-4 py-14 sm:px-6 lg:min-h-[32rem] lg:px-8">
          <Breadcrumbs items={[{ label: "About Us" }]} />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">Every journey begins with a dream</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">About <span className="text-amber-300">Indian Rounds</span></h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90">
            The world is full of places waiting to be explored and memories waiting to be created. We make travel simpler, more accessible and more meaningful for everyone.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/tours" className="rounded-full bg-brand-red px-7 py-3 font-semibold text-white shadow-lg hover:bg-brand-red-dark">Explore Packages</Link>
            <OpenQuoteButton className="rounded-full border border-white/70 px-7 py-3 font-semibold hover:bg-white hover:text-ink">Plan Your Trip</OpenQuoteButton>
          </div>
        </div>
      </section>

      {/* Facts that come straight from the catalogue */}
      <section aria-label="Indian Rounds at a glance" className="border-b border-black/10 bg-white">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {stats.map((s) => (
            <li key={s.label} className="px-2 py-6 text-center lg:py-8">
              <p className="text-xl font-extrabold leading-tight text-brand-red sm:text-2xl lg:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Introduction + 2. Our Story */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <Kicker n="01">Our Story</Kicker>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Born from a dream. <span className="text-brand-red">Built for every traveller.</span></h2>
            <div className="mt-5 space-y-4 leading-relaxed text-ink/85">
              <p>Every great journey begins with a dream. For us, that dream started with a simple belief: exploring the world should not be limited by budgets, complicated planning, or a lack of information.</p>
              <p>We understood how difficult it could be to choose the right destination, estimate travel expenses, compare tour options, and organise a memorable trip. Too often, the excitement of travelling was overshadowed by the challenges of planning it.</p>
              <p className="font-semibold text-ink">That inspired the idea behind Indian Rounds.</p>
              <p>We set out to create a travel platform that helps people discover destinations, explore suitable travel options, and plan experiences that match their interests and budgets. From affordable domestic holidays to unforgettable international adventures, our aim is to make the journey from inspiration to exploration easier.</p>
              <p>Today, Indian Rounds stands for the spirit of discovery, the joy of travelling, and the belief that everyone deserves the opportunity to experience something extraordinary.</p>
            </div>
            <p className="mt-5 border-l-4 border-brand-red pl-4 font-semibold">Our story is still unfolding, and we invite you to be part of it.</p>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative mx-auto max-w-xl pb-10 pr-10">
              <div className="overflow-hidden rounded-3xl shadow-float">
                <CoverImage src="/photos/places/kerala/alleppey-houseboat.jpg" alt="A houseboat on the Kerala backwaters" seed="story" className="aspect-[4/5]" sizes="(min-width: 1024px) 40vw, 90vw" />
              </div>
              <div className="absolute bottom-0 right-0 w-1/2 overflow-hidden rounded-2xl border-4 border-white shadow-float">
                <CoverImage src="/photos/places/rajasthan/city-palace-udaipur.jpg" alt="The City Palace in Udaipur" seed="story2" className="aspect-square" sizes="(min-width: 1024px) 20vw, 45vw" />
              </div>
              <p className="absolute left-4 top-4 rounded-full bg-white/95 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-red shadow">Your dream destination is closer than you think</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 4. What we do */}
      <section className="bg-surface-alt">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Reveal>
            <Kicker n="02">What We Do</Kicker>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">Everything you need to <span className="text-brand-red">plan your next adventure</span></h2>
          </Reveal>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(({ icon: Icon, title, text }, i) => (
              <li key={title}>
                <Reveal delay={(i % 3) * 90} className="h-full">
                  <div className="group h-full rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-float">
                    <span className="grid size-12 place-items-center rounded-xl bg-brand-red/10 text-brand-red transition group-hover:bg-brand-red group-hover:text-white"><Icon size={24} aria-hidden /></span>
                    <h3 className="mt-4 text-lg font-bold">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Mission and vision */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="h-full">
            <article className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-red-dark to-brand-red p-8 text-white sm:p-10">
              <Target className="absolute -right-6 -top-6 size-40 text-white/10" aria-hidden />
              <Kicker n="03" light>Our Mission</Kicker>
              <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">Making travel accessible to everyone</h2>
              <div className="mt-4 space-y-3 leading-relaxed text-white/90">
                <p>Our mission is to simplify travel planning and make meaningful travel experiences more accessible to people from all walks of life.</p>
                <p>We aim to help travellers make informed decisions through useful destination information, practical guidance, and a range of tour options suited to different interests and budgets.</p>
                <p>By removing unnecessary complexity from travel planning, we want to give people more confidence to explore new places, connect with different cultures, and create memories that last a lifetime.</p>
              </div>
            </article>
          </Reveal>
          <Reveal delay={120} className="h-full">
            <article className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-ink to-slate-800 p-8 text-white sm:p-10">
              <Eye className="absolute -right-6 -top-6 size-40 text-white/10" aria-hidden />
              <Kicker n="04" light>Our Vision</Kicker>
              <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">A world where everyone can explore</h2>
              <div className="mt-4 space-y-3 leading-relaxed text-white/90">
                <p>We envision a world where travel is an achievable dream rather than a distant aspiration.</p>
                <p>Indian Rounds aspires to become a trusted destination for travel inspiration, information and tour planning, connecting people with experiences that broaden their horizons and bring them closer to the world around them.</p>
                <p>We want to inspire a new generation of travellers to explore confidently, appreciate cultural diversity, and discover the extraordinary in every journey.</p>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      {/* 5. Why Indian Rounds */}
      <section className="bg-surface-alt">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[2fr_3fr] lg:gap-16 lg:px-8 lg:py-20">
          <Reveal>
            <div className="lg:sticky lg:top-32">
              <Kicker n="05">Why Choose Indian Rounds?</Kicker>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Travel planning <span className="text-brand-red">with you in mind</span></h2>
              <p className="mt-4 text-muted">Five simple reasons travellers start with us.</p>
              <div className="mt-6 hidden overflow-hidden rounded-2xl lg:block">
                <CoverImage src="/photos/places/sikkim/kanchenjunga-pelling.jpg" alt="Kanchenjunga seen from Pelling" seed="why" className="aspect-[4/3]" sizes="30vw" />
              </div>
            </div>
          </Reveal>
          <ol className="space-y-4">
            {reasons.map((r, i) => (
              <li key={r.title}>
                <Reveal delay={i * 70}>
                  <div className="flex gap-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-red text-lg font-extrabold text-white" aria-hidden>{i + 1}</span>
                    <div>
                      <h3 className="text-lg font-bold">{r.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{r.text}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. Philosophy */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10">
          <CoverImage src="/photos/places/uzbekistan/registan-square.jpg" alt="" seed="philosophy" className="h-full w-full" sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-black/70" aria-hidden />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:py-24">
          <Reveal>
            <Quote className="mx-auto text-amber-300" size={36} aria-hidden />
            <p className="mt-3 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-amber-300">06 · Our Travel Philosophy</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">The world is more than a destination</h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-white/90">
              <p>At Indian Rounds, we believe travel is an opportunity to learn, connect and grow.</p>
              <p>It is the joy of watching a sunrise in the mountains, discovering a new culture, tasting unfamiliar flavours, spending quality time with loved ones, and finding inspiration in places beyond our everyday lives.</p>
              <p>We believe every journey has a story, every destination has something to teach us, and every traveller deserves the chance to discover their own version of extraordinary.</p>
            </div>
            <p className="mt-6 text-xl font-bold text-amber-300">That is the spirit we bring to Indian Rounds.</p>
          </Reveal>
        </div>
      </section>

      {/* 7. Promise */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal>
          <div className="grid items-center gap-8 rounded-3xl border border-black/10 bg-white p-8 shadow-float sm:p-10 md:grid-cols-[auto_1fr]">
            <span className="grid size-20 place-items-center rounded-2xl bg-brand-red/10 text-brand-red"><ShieldCheck size={40} aria-hidden /></span>
            <div>
              <Kicker n="07">Our Promise</Kicker>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Your journey matters to us</h2>
              <div className="mt-3 space-y-3 leading-relaxed text-ink/85">
                <p>We are committed to making travel discovery and planning more approachable, informative and convenient.</p>
                <p>We aim to provide useful information, present travel options clearly, and help travellers make choices that suit their needs. We believe trust is built through transparency, helpful guidance, and a genuine commitment to the traveller&apos;s experience.</p>
                <p>From the first spark of inspiration to the excitement of planning your next holiday, Indian Rounds is here to help you take the next step towards your travel dreams.</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 8. Final call to action */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10">
          <CoverImage src="/photos/places/indonesia/bali-swing-ubud.jpg" alt="" seed="about-cta" className="h-full w-full" sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-red-dark/90 via-black/65 to-black/40" aria-hidden />
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:py-24">
          <Reveal>
            <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-amber-300"><Sparkles size={15} aria-hidden /> 08 · Start your next journey</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">The world is waiting. <span className="text-amber-300">Where will you go?</span></h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">A mountain retreat, a relaxing beach holiday, a cultural escape, or an international adventure: your next unforgettable experience could begin today.</p>
            <p className="mx-auto mt-2 max-w-2xl text-white/85">Discover new destinations, explore tour packages, and start planning a journey that is uniquely yours.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/tours" className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 font-semibold text-brand-red hover:bg-white/90">Explore Packages <ArrowRight size={18} aria-hidden /></Link>
              <OpenQuoteButton className="rounded-full border border-white/80 px-8 py-3.5 font-semibold hover:bg-white hover:text-ink">Plan Your Trip</OpenQuoteButton>
            </div>
            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-white/80"><HeartHandshake size={16} aria-hidden /> Discover more. Travel further. Create memories.</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
