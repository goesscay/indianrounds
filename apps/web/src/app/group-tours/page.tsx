import type { Metadata } from "next";
import Link from "next/link";
import { getDepartures, getMenuCountries } from "@/lib/api";
import { MENUS } from "@/lib/menus";
import { CoverImage } from "@/components/CoverImage";
import { DeparturesExplorer } from "@/components/departures/DeparturesExplorer";
import { Rail } from "@/components/home/Rail";
import { PlaceCard } from "@/components/home/HomeParts";
import { Breadcrumbs } from "@/components/MenuViews";
import { OpenQuoteButton } from "@/components/LeadModal";
import { SectionHeading } from "@/components/SectionHeading";

export const revalidate = 60;

export const metadata: Metadata = {
  title: MENUS["group-tours"].title,
  description: "Upcoming group trips and weekend getaways with fixed dates and a trip captain. Filter by destination, duration, budget and month.",
  alternates: { canonical: "/group-tours" },
};

export default async function GroupToursPage() {
  const [trips, countries] = await Promise.all([getDepartures(), getMenuCountries("group-tours")]);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10">
          <CoverImage src="/photos/places/thailand/phi-phi-islands.jpg" alt="" seed="group-tours" className="h-full w-full" sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/50 to-black/20" aria-hidden />
        <div className="mx-auto flex min-h-[16rem] max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:min-h-[20rem] lg:px-8">
          <Breadcrumbs items={[{ label: "Group Tours" }]} />
          <h1 className="text-4xl font-extrabold sm:text-6xl">Upcoming <span className="text-brand-red">Group Trips</span></h1>
          <p className="mt-3 max-w-xl text-white/90 sm:text-lg">Fixed dates, a trip captain and a group to share the journey. Pick a month, set your budget and go.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="#trips" className="rounded-full bg-brand-red px-6 py-3 font-semibold text-white shadow-lg hover:bg-brand-red-dark">See upcoming trips</a>
            <OpenQuoteButton className="rounded-full border border-white/70 px-6 py-3 font-semibold hover:bg-white hover:text-brand-red">Plan a private group trip</OpenQuoteButton>
          </div>
        </div>
      </section>

      <div id="trips" className="scroll-mt-32">
        {trips.length > 0 ? (
          <DeparturesExplorer trips={trips} />
        ) : (
          <div className="mx-auto max-w-3xl px-4 py-20 text-center">
            <h2 className="text-2xl font-extrabold">New group departures are on the way</h2>
            <p className="mt-2 text-muted">Tell us where you would like to go and we will tell you when the next group leaves, or plan one just for you.</p>
            <div className="mt-6"><OpenQuoteButton className="rounded-full bg-brand-red px-7 py-3 font-semibold text-white hover:bg-brand-red-dark">Get a Free Quote</OpenQuoteButton></div>
          </div>
        )}
      </div>

      {countries.length > 0 && (
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <SectionHeading lead="Browse group trips by" accent="Country" sub="See every group trip and category for a destination" />
            <Rail label="Group trip countries">
              {countries.map((c) => <PlaceCard key={c.slug} href={`/group-tours/${c.slug}`} place={c} />)}
            </Rail>
            <p className="mt-4 text-sm text-muted">Looking for a short break? See <Link href="/weekend-escapes" className="font-semibold text-brand-red underline">weekend getaways</Link>.</p>
          </div>
        </section>
      )}
    </>
  );
}
