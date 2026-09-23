import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Headphones, ShieldCheck, Plane, BadgeCheck, Sparkles, Compass, Handshake } from "lucide-react";
import { getCollections, getDestinations, getPosts, getTestimonials, getTours } from "@/lib/api";
import { DestinationCard } from "@/components/DestinationCard";
import { OpenQuoteButton } from "@/components/LeadModal";
import { PostCard } from "@/components/PostCard";
import { SectionHeading } from "@/components/SectionHeading";
import { TestimonialCarousel } from "@/components/TestimonialCarousel";
import { TourCard } from "@/components/TourCard";
import { TourSearchBar } from "@/components/TourSearchBar";

export const revalidate = 60;

const trust = [
  { icon: Plane, title: "Curated Tours", sub: "Only" },
  { icon: ShieldCheck, title: "Safe & Secure", sub: "Booking" },
  { icon: Headphones, title: "24/7 Travel", sub: "Support" },
  { icon: BadgeCheck, title: "Best Price", sub: "Guarantee" },
];

export default async function Home() {
  const [destinations, tours, testimonials, collections, posts] = await Promise.all([
    getDestinations({ featured: "1" }),
    getTours({ featured: "1", per_page: "4" }),
    getTestimonials(),
    getCollections(),
    getPosts({ per_page: "3" }),
  ]);
  const themes = collections.filter((c) => c.tours_count > 0).slice(0, 4);

  return (
    <>
      <section className="relative overflow-hidden bg-ink">
        <Image
          src="/photos/hero-maldives.jpg"
          alt="Overwater villas on a turquoise lagoon, one of Indian Rounds' island destinations"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/15" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-ink/10" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8 lg:pb-20 lg:pt-12">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/80">Explore · Experience · Belong</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            JOURNEYS
            <br />
            THAT STAY
            <br />
            <span className="text-brand-red">FOREVER</span>
          </h1>
          <p className="mt-3 max-w-md text-base text-white/85">Discover handpicked destinations, seamless booking and unforgettable travel experiences with Indian Rounds.</p>
          <Link href="/destinations" className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-red px-7 py-3.5 font-semibold text-white transition hover:bg-brand-red-dark">
            Explore Destinations <ArrowRight size={18} />
          </Link>
          <p className="absolute right-6 top-8 hidden -rotate-6 font-script text-3xl text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] lg:block xl:right-24 xl:text-4xl">Travel<br />Beyond<br />Borders</p>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 sm:px-6 lg:-mt-14 lg:px-8">
        <TourSearchBar destinations={destinations} />
        <ul className="mt-6 grid grid-cols-2 gap-4 py-4 lg:grid-cols-4">
          {trust.map(({ icon: Icon, title, sub }) => (
            <li key={title} className="flex items-center gap-3 lg:justify-center">
              <Icon className="text-brand-red" size={30} />
              <span className="text-sm font-semibold leading-tight">{title}<br />{sub}</span>
            </li>
          ))}
        </ul>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeading lead="Popular" accent="Destinations" sub="Handpicked places for your next getaway" href="/destinations" cta="View All Destinations" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {destinations.slice(0, 5).map((d) => (
            <DestinationCard key={d.slug} destination={d} />
          ))}
        </div>
        {destinations.length === 0 && <p className="text-muted">Destinations will appear here once the catalogue is loaded.</p>}
      </section>

      <section className="relative overflow-hidden bg-gradient-to-r from-brand-red-dark to-brand-red text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr] lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/80">More than just a trip</p>
            <h2 className="mt-2 text-4xl font-extrabold leading-tight sm:text-5xl">Travel with<br />Indian Rounds</h2>
            <p className="mt-4 max-w-lg text-sm text-white/85">We design journeys that inspire — whether it&apos;s a peaceful beach holiday, an adventurous escape, or a cultural exploration, we make travel simple, personal and memorable.</p>
            <OpenQuoteButton className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-red hover:bg-white/90">
              Plan Your Journey <ArrowRight size={16} />
            </OpenQuoteButton>
          </div>
          <ul className="space-y-4">
            {[
              { icon: Sparkles, label: "Memorable Experiences" },
              { icon: Compass, label: "Customized Tours" },
              { icon: Handshake, label: "Trusted Travel Partner" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-full bg-white/15"><Icon size={22} /></span>
                <span className="font-semibold">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeading lead="Trending" accent="Tours" sub="Most loved tours by our travellers" href="/tours" cta="View All Tours" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tours.data.map((t) => (
            <TourCard key={t.slug} tour={t} />
          ))}
        </div>
        {tours.data.length === 0 && <p className="text-muted">Tours will appear here once the catalogue is loaded.</p>}
      </section>

      {themes.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <SectionHeading lead="Explore by" accent="Theme" sub="Weekend breaks, festivals, luxury escapes and more" />
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {themes.map((c) => (
              <li key={c.slug}>
                <Link href={`/collections/${c.slug}`} className="group block h-full rounded-card border border-black/10 bg-white p-5 transition hover:border-brand-red hover:shadow-float">
                  <h3 className="font-bold group-hover:text-brand-red">{c.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{c.intro}</p>
                  <p className="mt-3 text-xs font-semibold text-brand-red">{c.tours_count} tour{c.tours_count === 1 ? "" : "s"} →</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <SectionHeading lead="What Our" accent="Travellers Say" sub="Real experiences. Real stories." />
            <TestimonialCarousel items={testimonials} />
          </div>
        </section>
      )}

      {posts.data.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeading lead="From the" accent="Blog" sub="Guides and stories to plan your next trip" href="/blog" cta="Read the Blog" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.data.map((p) => <PostCard key={p.slug} post={p} />)}
          </div>
        </section>
      )}

      <section className="bg-gradient-to-r from-brand-red-dark to-brand-red text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-3xl font-extrabold">Ready for Your Next Adventure?</h2>
            <p className="mt-1 text-sm text-white/85">Let our travel experts help you plan the perfect trip.</p>
          </div>
          <OpenQuoteButton className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 font-semibold text-brand-red hover:bg-white/90">
            Get a Free Quote <ArrowRight size={18} />
          </OpenQuoteButton>
        </div>
      </section>
    </>
  );
}
