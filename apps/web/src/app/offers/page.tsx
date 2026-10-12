import type { Metadata } from "next";
import { BadgePercent, CalendarClock, Tag, Users } from "lucide-react";
import { getAllTours } from "@/lib/api";
import { CoverImage } from "@/components/CoverImage";
import { OpenQuoteButton } from "@/components/LeadModal";
import { Breadcrumbs } from "@/components/MenuViews";
import { OffersExplorer } from "@/components/offers/OffersExplorer";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Special Offers",
  description: "Discounted holiday packages from Indian Rounds: group trips, weekend getaways, honeymoons and private packages priced below their usual rate.",
  alternates: { canonical: "/offers" },
};

const notes = [
  { icon: Tag, title: "Real savings", text: "Each offer shows the usual price struck through next to today's price, so you can see exactly what you save." },
  { icon: CalendarClock, title: "Limited dates", text: "Offer prices apply to the dates and seats shown and can change when they sell out." },
  { icon: Users, title: "Per person", text: "Prices are per person on twin sharing. The inclusions and exclusions are listed on every package." },
];

export default async function OffersPage() {
  const all = await getAllTours({ offers: "1", sort: "saving" });
  const offers = all.filter((t): t is typeof t & { price: number; original_price: number } => t.price !== null && t.original_price !== null && t.original_price > t.price);
  const best = offers.reduce((m, t) => Math.max(m, Math.round(((t.original_price - t.price) / t.original_price) * 100)), 0);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10">
          <CoverImage src="/photos/places/indonesia/tegalalang-rice-terraces.jpg" alt="" seed="offers" className="h-full w-full" sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-red-dark/90 via-black/60 to-black/25" aria-hidden />
        <div className="mx-auto flex min-h-[18rem] max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:min-h-[22rem] lg:px-8">
          <Breadcrumbs items={[{ label: "Special Offers" }]} />
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-amber-300"><BadgePercent size={16} aria-hidden /> Limited-time savings</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-6xl">Special <span className="text-amber-300">Offers</span></h1>
          <p className="mt-3 max-w-xl text-white/90 sm:text-lg">Handpicked holidays priced below their usual rate. Book while the dates and seats last.</p>
          {offers.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
              <li className="rounded-full bg-amber-300 px-4 py-1.5 text-ink">Up to {best}% off</li>
              <li className="rounded-full bg-white/15 px-4 py-1.5 backdrop-blur">{offers.length} offers live</li>
            </ul>
          )}
        </div>
      </section>

      {offers.length > 0 ? (
        <OffersExplorer offers={offers} />
      ) : (
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-2xl font-extrabold">New offers are on the way</h2>
          <p className="mt-2 text-muted">There are no discounted packages right now. Tell us what you are looking for and we will find the best price.</p>
          <div className="mt-6"><OpenQuoteButton className="rounded-full bg-brand-red px-7 py-3 font-semibold text-white hover:bg-brand-red-dark">Get a Free Quote</OpenQuoteButton></div>
        </div>
      )}

      <section className="bg-surface-alt">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold sm:text-3xl">How our offers <span className="text-brand-red">work</span></h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {notes.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl bg-white p-6 shadow-sm">
                <span className="grid size-11 place-items-center rounded-full bg-brand-red/10 text-brand-red"><Icon size={22} aria-hidden /></span>
                <h3 className="mt-3 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-gradient-to-r from-brand-red-dark to-brand-red text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-3xl font-extrabold">Can&apos;t see the right deal?</h2>
            <p className="mt-1 text-sm text-white/85">Tell us your dates and budget and we will look for the best price for you.</p>
          </div>
          <OpenQuoteButton className="rounded-full bg-white px-8 py-3.5 font-semibold text-brand-red hover:bg-white/90">Get a Free Quote</OpenQuoteButton>
        </div>
      </section>
    </>
  );
}
