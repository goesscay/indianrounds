import Link from "next/link";
import { ArrowRight, CalendarCheck, Compass, Headphones, HeartHandshake, Map, MessageCircle, Route, Salad, ShieldCheck, Sparkles, Users } from "lucide-react";
import { getDestinations, getMenuCountries, getPosts, getTestimonials, getTours } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { CoverImage } from "@/components/CoverImage";
import { PostCard } from "@/components/PostCard";
import { SectionHeading } from "@/components/SectionHeading";
import { TestimonialCarousel } from "@/components/TestimonialCarousel";
import { TourCard } from "@/components/TourCard";
import { TourSearchBar } from "@/components/TourSearchBar";
import { PlaceCard, QuoteButton, RailSection, VideoBand } from "@/components/home/HomeParts";
import { Rail } from "@/components/home/Rail";
import { Reveal } from "@/components/home/Reveal";
import { site } from "@/lib/site";

export const revalidate = 60;

const moods = [
  { href: "/group-tours", title: "Group Trips", text: "Fixed dates, a trip captain, new friends", photo: "/photos/places/thailand/phi-phi-islands.jpg" },
  { href: "/weekend-escapes", title: "Weekend Getaways", text: "Fly Friday, back by Monday", photo: "/photos/places/united-arab-emirates/burj-khalifa.jpg" },
  { href: "/honeymoon", title: "Romantic Escapes", text: "Private, unhurried, made for two", photo: "/photos/places/indonesia/bali-swing-ubud.jpg" },
  { href: "/custom-trips", title: "Custom Trips", text: "Tell us your dream, we plan it", photo: "/photos/places/morocco/chefchaouen-blue-city.jpg" },
];

const why = [
  { icon: HeartHandshake, title: "Planned by people", text: "A travel expert shapes your itinerary and is a call or WhatsApp away before and during your trip." },
  { icon: Salad, title: "Made for Indian travellers", text: "Vegetarian and Jain meal options, Indian restaurants on the way, and a clear note on every visa." },
  { icon: Users, title: "Trip captains on group trips", text: "Fixed departures run with a trip captain, so you travel with a group and never alone." },
  { icon: ShieldCheck, title: "Clear about what you get", text: "Inclusions, exclusions and day-by-day plans are spelled out on every package before you ask for a quote." },
  { icon: Compass, title: "Every trip can be tailored", text: "Change the hotels, the pace or the dates. Your package is a starting point, not a fixed box." },
  { icon: Headphones, title: "Help when it matters", text: "Real people answer your questions, from the first enquiry to the flight home." },
];

const steps = [
  { icon: Map, title: "Pick a place", text: "Browse destinations and ready-made packages, or tell us where you want to go." },
  { icon: MessageCircle, title: "Talk to us", text: "Share your dates, group and budget. We reply with a tailored plan and price." },
  { icon: CalendarCheck, title: "Confirm and pack", text: "We sort the bookings and visa guidance, you get excited and pack." },
  { icon: Sparkles, title: "Enjoy the trip", text: "Travel with support on call, and come home with stories to tell." },
];

const frames = [
  { photo: "/photos/places/united-arab-emirates/burj-khalifa.jpg", name: "Dubai", span: "sm:col-span-2 sm:row-span-2" },
  { photo: "/photos/places/indonesia/tegalalang-rice-terraces.jpg", name: "Bali", span: "" },
  { photo: "/photos/places/thailand/phi-phi-islands.jpg", name: "Phi Phi", span: "" },
  { photo: "/photos/places/morocco/chefchaouen-blue-city.jpg", name: "Chefchaouen", span: "sm:row-span-2" },
  { photo: "/photos/places/vietnam/ha-long-bay.jpg", name: "Ha Long Bay", span: "" },
  { photo: "/photos/places/georgia/gergeti-trinity-church.jpg", name: "Kazbegi", span: "" },
  { photo: "/photos/places/uzbekistan/registan-square.jpg", name: "Samarkand", span: "sm:col-span-2" },
  { photo: "/photos/places/tanzania/ngorongoro-crater.jpg", name: "Ngorongoro", span: "" },
  { photo: "/photos/places/singapore/gardens-by-the-bay.jpg", name: "Singapore", span: "" },
  { photo: "/photos/places/kazakhstan/kolsai-lakes.jpg", name: "Kolsai Lakes", span: "sm:col-span-2" },
];

export default async function Home() {
  const [destinations, international, romantic, weekend, groupTours, allGroup, packages, testimonials, posts] = await Promise.all([
    getDestinations(),
    getMenuCountries("destinations"),
    getMenuCountries("honeymoon"),
    getMenuCountries("weekend-escapes"),
    getMenuCountries("group-tours"),
    getTours({ type: "group", per_page: "24" }),
    getTours({ per_page: "1" }),
    getTestimonials(),
    getPosts({ per_page: "3" }),
  ]);
  const india = destinations.filter((d) => d.region === "india");
  const featured = destinations.filter((d) => d.featured);
  const upcoming = allGroup.data
    .filter((t) => t.next_batch && t.price !== null && !(t.tags ?? []).includes("weekend"))
    .sort((a, b) => a.next_batch!.starts_on.localeCompare(b.next_batch!.starts_on))
    .slice(0, 10);
  const stats = [
    { value: destinations.length, label: "Destinations" },
    { value: packages.meta?.total ?? 0, label: "Holiday packages" },
    { value: groupTours.reduce((n, c) => n + c.tours_count, 0), label: "Group & weekend trips" },
  ].filter((s) => s.value > 0);

  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/video/hero-coast.jpg" alt="" className="h-full w-full object-cover" />
          <video className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden" src="/video/hero-coast.mp4" poster="/video/hero-coast.jpg" autoPlay muted loop playsInline preload="metadata" aria-hidden />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/40 to-black/5" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/60 via-transparent to-black/20" aria-hidden />
        <div className="mx-auto flex min-h-[32rem] max-w-7xl flex-col justify-center px-4 pb-28 pt-14 sm:px-6 lg:min-h-[40rem] lg:px-8 lg:pb-36">
          <p className="anim-fade-up text-xs font-semibold uppercase tracking-[0.35em] text-white/85">Explore · Experience · Belong</p>
          <h1 className="anim-fade-up mt-4 text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl" style={{ animationDelay: "120ms" }}>
            Journeys that
            <br />
            stay <span className="text-brand-red drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]">forever</span>
          </h1>
          <p className="anim-fade-up mt-5 max-w-xl text-lg text-white/90" style={{ animationDelay: "260ms" }}>
            Handpicked holidays, group trips and honeymoon escapes, planned by travel experts who answer your calls.
          </p>
          <div className="anim-fade-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "400ms" }}>
            <Link href="/destinations" className="inline-flex items-center gap-2 rounded-full bg-brand-red px-7 py-3.5 font-semibold text-white shadow-lg transition hover:bg-brand-red-dark">
              Explore destinations <ArrowRight size={18} />
            </Link>
            <a
              href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Hi Indian Rounds, I'd like help planning a trip.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/70 px-6 py-3.5 font-semibold text-white transition hover:bg-white hover:text-brand-red"
            >
              <MessageCircle size={18} aria-hidden /> Chat with an expert
            </a>
          </div>
          {featured.length > 0 && (
            <ul className="anim-fade-up mt-8 hidden flex-wrap items-center gap-2 text-sm sm:flex" style={{ animationDelay: "520ms" }}>
              <li className="text-white/70">Popular now:</li>
              {featured.slice(0, 6).map((d) => (
                <li key={d.slug}>
                  <Link href={`/destinations/${d.slug}`} className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur transition hover:bg-white hover:text-brand-red">
                    {d.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-20 max-w-6xl px-4 sm:px-6 lg:-mt-24 lg:px-8">
        <TourSearchBar destinations={destinations} />
        {stats.length > 0 && (
          <ul className="mt-6 grid grid-cols-3 gap-3 text-center">
            {stats.map((s) => (
              <li key={s.label} className="rounded-2xl bg-white px-2 py-4 shadow-sm ring-1 ring-black/5">
                <p className="text-3xl font-extrabold text-brand-red sm:text-4xl">{s.value}+</p>
                <p className="mt-0.5 text-xs font-medium text-muted sm:text-sm">{s.label}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* MOODS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <Reveal>
          <SectionHeading lead="How do you want to" accent="travel?" sub="Choose the kind of trip that sounds like you" />
        </Reveal>
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {moods.map((m, i) => (
            <li key={m.href}>
              <Reveal delay={i * 80}>
                <Link href={m.href} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl shadow-float">
                  <div className="absolute inset-0"><CoverImage src={m.photo} alt={m.title} seed={m.href} sizes="(min-width: 1024px) 25vw, 50vw" className="h-full w-full transition duration-700 group-hover:scale-110" /></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                    <h3 className="text-lg font-extrabold leading-tight sm:text-2xl">{m.title}</h3>
                    <p className="mt-1 hidden text-sm text-white/85 sm:block">{m.text}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold">
                      Explore <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* INDIA (appears as soon as India destinations are added in the admin) */}
      {india.length > 0 && (
        <RailSection kicker="Closer to home" lead="India" accent="Trips" blurb="Mountains, backwaters, deserts and coastlines, planned the way you like to travel." href="/destinations" cta="Explore India" label="India destinations" tone="sand">
          {india.map((d) => (
            <PlaceCard key={d.slug} href={`/destinations/${d.slug}`} place={{ slug: d.slug, name: d.name, image_url: d.image_url, tours_count: d.tours_count ?? 0, menu_starting_price: d.starting_price }} />
          ))}
        </RailSection>
      )}

      {/* INTERNATIONAL */}
      {international.length > 0 && (
        <RailSection kicker="Around the world" lead="International" accent="Trips" blurb="From skylines and deserts to islands, Silk Road cities and safaris. Pick a country and see every package." href="/destinations" cta="All destinations" label="International destinations">
          {international.map((d) => (
            <PlaceCard key={d.slug} href={`/destinations/${d.slug}`} place={d} />
          ))}
        </RailSection>
      )}

      {/* VIDEO */}
      <VideoBand src="/video/beach-waves.mp4" poster="/video/beach-waves.jpg" kicker="Your next story" title="Your next story starts with a sunrise" text="Tell us where you have always wanted to go. We will plan the days, the stays and the small details in between.">
        <div className="mt-7 flex flex-wrap gap-3">
          <QuoteButton>Plan my trip <ArrowRight size={18} /></QuoteButton>
          <Link href="/tours" className="inline-flex items-center gap-2 rounded-full border border-white/70 px-6 py-3.5 font-semibold transition hover:bg-white hover:text-brand-red">
            Browse all packages
          </Link>
        </div>
      </VideoBand>

      {/* ROMANTIC */}
      {romantic.length > 0 && (
        <RailSection tone="rose" kicker="For two" lead="Romantic" accent="Escapes" blurb="Private, unhurried honeymoon trips with candlelit dinners, couple time and views worth the flight." href="/honeymoon" cta="See honeymoon trips" label="Romantic destinations">
          {romantic.map((d) => (
            <PlaceCard key={d.slug} href={`/honeymoon/${d.slug}`} place={d} />
          ))}
        </RailSection>
      )}

      {/* UPCOMING DEPARTURES */}
      {upcoming.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Reveal>
            <SectionHeading lead="Upcoming" accent="Group Departures" sub="Fixed dates, a trip captain and a group to share the journey" href="/group-tours" cta="All group trips" />
          </Reveal>
          <Reveal>
            <Rail label="Upcoming group departures">
              {upcoming.map((t) => (
                <li key={t.slug} className="w-72 shrink-0 snap-start">
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-red">
                    <CalendarCheck size={14} aria-hidden /> Next departure {formatDate(t.next_batch!.starts_on)}
                  </p>
                  <TourCard tour={t} />
                </li>
              ))}
            </Rail>
          </Reveal>
        </section>
      )}

      {/* WEEKEND */}
      {weekend.length > 0 && (
        <RailSection tone="sand" kicker="Short on time?" lead="Weekend" accent="Getaways" blurb="Three nights, one bag, a head full of memories. Fly out on Friday and be back for Monday." href="/weekend-escapes" cta="See weekend trips" label="Weekend getaway destinations">
          {weekend.map((d) => (
            <PlaceCard key={d.slug} href={`/weekend-escapes/${d.slug}`} place={d} />
          ))}
        </RailSection>
      )}

      {/* WHY */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <Reveal>
          <SectionHeading lead="Why travel with" accent="Indian Rounds" sub="The little things that make a trip feel easy" />
        </Reveal>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {why.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <Reveal delay={(i % 3) * 90} className="h-full">
                <div className="h-full rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-brand-red/40 hover:shadow-float">
                  <span className="grid size-12 place-items-center rounded-full bg-brand-red/10 text-brand-red"><Icon size={24} aria-hidden /></span>
                  <h3 className="mt-4 text-lg font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-red-dark to-brand-red text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">Simple, start to finish</p>
            <h2 className="mt-3 max-w-xl text-4xl font-extrabold leading-tight sm:text-5xl">Your trip in four easy steps</h2>
          </Reveal>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title}>
                <Reveal delay={i * 100} className="h-full">
                  <div className="relative h-full rounded-2xl bg-white/10 p-6 backdrop-blur">
                    <span className="absolute right-5 top-4 text-5xl font-extrabold text-white/15" aria-hidden>{i + 1}</span>
                    <span className="grid size-12 place-items-center rounded-full bg-white text-brand-red"><Icon size={24} aria-hidden /></span>
                    <h3 className="mt-4 text-lg font-bold">{title}</h3>
                    <p className="mt-1 text-sm text-white/85">{text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
          <Reveal className="mt-10">
            <QuoteButton className="!bg-white !text-brand-red hover:!bg-white/90">Start planning <Route size={18} /></QuoteButton>
          </Reveal>
        </div>
      </section>

      {/* JOURNEY IN FRAMES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <Reveal>
          <SectionHeading lead="Journeys in" accent="Frames" sub="A glimpse of the places waiting for you" />
        </Reveal>
        <ul className="grid auto-rows-[9rem] grid-flow-dense grid-cols-2 gap-3 sm:auto-rows-[10rem] sm:grid-cols-4">
          {frames.map((f, i) => (
            <li key={f.photo} className={f.span}>
              <Reveal delay={(i % 4) * 70} className="h-full">
                <div className="group relative h-full overflow-hidden rounded-2xl">
                  <div className="absolute inset-0"><CoverImage src={f.photo} alt={`${f.name}, one of our destinations`} seed={f.name} sizes="(min-width: 640px) 25vw, 50vw" className="h-full w-full transition duration-700 group-hover:scale-110" /></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent opacity-80 transition group-hover:opacity-100" />
                  <p className="absolute bottom-3 left-4 text-sm font-semibold text-white">{f.name}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {testimonials.length > 0 && (
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <SectionHeading lead="What Our" accent="Travellers Say" sub="Real experiences. Real stories." />
            <TestimonialCarousel items={testimonials} />
          </div>
        </section>
      )}

      {posts.data.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeading lead="From the" accent="Blog" sub="Guides and stories to plan your next trip" href="/blog" cta="Read the Blog" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.data.map((p) => <PostCard key={p.slug} post={p} />)}
          </div>
        </section>
      )}

      <section className="bg-gradient-to-r from-brand-red-dark to-brand-red text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-12 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-3xl font-extrabold">Ready for your next adventure?</h2>
            <p className="mt-1 text-sm text-white/85">Tell us where and when. Our travel experts will do the rest.</p>
          </div>
          <QuoteButton className="!bg-white !text-brand-red hover:!bg-white/90">Get a Free Quote <ArrowRight size={18} /></QuoteButton>
        </div>
      </section>
    </>
  );
}
