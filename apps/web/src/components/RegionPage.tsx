import { CalendarCheck } from "lucide-react";
import { getMenuCountries, getTours } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format";
import { regionLinks } from "@/lib/site";
import { CoverImage } from "./CoverImage";
import { DestinationCard } from "./DestinationCard";
import { Rail } from "./home/Rail";
import { Breadcrumbs } from "./MenuViews";
import { OpenQuoteButton } from "./LeadModal";
import { SectionHeading } from "./SectionHeading";
import { TourCard } from "./TourCard";

const copy = {
  india: {
    title: "Explore India",
    sub: "Mountains, backwaters, deserts, islands and old cities. Pick a state and see every package.",
    photo: "/photos/places/ladakh/pangong-tso-lake.jpg",
    seed: "explore-india",
    groupSub: "Fixed dates and a trip captain across India",
    romanceSub: "Private honeymoon trips in India",
    weekendSub: "Short breaks, back by Monday",
  },
  international: {
    title: "Explore the World",
    sub: "From skylines and deserts to islands, Silk Road cities and safaris. Pick a country and see every package.",
    photo: "/photos/places/united-arab-emirates/burj-khalifa.jpg",
    seed: "explore-world",
    groupSub: "Fixed dates and a trip captain abroad",
    romanceSub: "Private honeymoon trips abroad",
    weekendSub: "Short international breaks, back by Monday",
  },
} as const;

/** The page behind "Explore the World" and "Explore India": that region's destinations and its trips by kind. */
export async function RegionPage({ region }: { region: "india" | "international" }) {
  const c = copy[region];
  const [countries, groups, romance, weekend] = await Promise.all([
    getMenuCountries("destinations").then((all) => all.filter((d) => (region === "india" ? d.region === "india" : d.region !== "india"))),
    getTours({ region, type: "group", per_page: "24" }),
    getTours({ region, tag: "couples", per_page: "12" }),
    getTours({ region, tag: "weekend", per_page: "12" }),
  ]);
  const upcoming = groups.data
    .filter((t) => t.next_batch && !(t.tags ?? []).includes("weekend"))
    .sort((a, b) => a.next_batch!.starts_on.localeCompare(b.next_batch!.starts_on))
    .slice(0, 10);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10">
          <CoverImage src={c.photo} alt={c.title} seed={c.seed} className="h-full w-full" sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/45 to-black/25" aria-hidden />
        <div className="mx-auto flex min-h-[18rem] max-w-7xl flex-col justify-end px-4 pb-10 pt-12 sm:px-6 lg:min-h-[22rem] lg:px-8">
          <Breadcrumbs items={[{ label: regionLinks[region].label }]} />
          <h1 className="text-4xl font-extrabold sm:text-6xl">{c.title}</h1>
          <p className="mt-3 max-w-2xl text-white/90 sm:text-lg">{c.sub}</p>
          <div className="mt-5">
            <OpenQuoteButton options={{ title: `Plan my ${region === "india" ? "India" : "international"} trip` }} className="rounded-full bg-brand-red px-7 py-3 font-semibold text-white shadow-lg hover:bg-brand-red-dark">
              Get a Free Quote
            </OpenQuoteButton>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section>
          <SectionHeading lead={region === "india" ? "India" : "International"} accent="Destinations" sub={`${countries.length} place${countries.length === 1 ? "" : "s"} to choose from`} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {countries.map((d) => (
              <DestinationCard key={d.slug} destination={d} note={`${d.tours_count} package${d.tours_count === 1 ? "" : "s"}${d.menu_starting_price !== null ? ` from ${formatINR(d.menu_starting_price)}` : ""}`} />
            ))}
          </div>
          {countries.length === 0 && <p className="text-muted">Destinations will appear here soon.</p>}
        </section>

        {upcoming.length > 0 && (
          <TourRail lead="Upcoming" accent="Group Departures" sub={c.groupSub} href="/group-tours" cta="All group trips" tours={upcoming} label="Upcoming group departures" withDate />
        )}
        {romance.data.length > 0 && (
          <TourRail lead="Romantic" accent="Escapes" sub={c.romanceSub} href="/honeymoon" cta="All honeymoon trips" tours={romance.data} label="Romantic escapes" />
        )}
        {weekend.data.length > 0 && (
          <TourRail lead="Weekend" accent="Getaways" sub={c.weekendSub} href="/weekend-escapes" cta="All weekend trips" tours={weekend.data} label="Weekend getaways" />
        )}
      </div>
    </>
  );
}

function TourRail({ lead, accent, sub, href, cta, tours, label, withDate = false }: {
  lead: string; accent: string; sub: string; href: string; cta: string; tours: Awaited<ReturnType<typeof getTours>>["data"]; label: string; withDate?: boolean;
}) {
  return (
    <section>
      <SectionHeading lead={lead} accent={accent} sub={sub} href={href} cta={cta} />
      <Rail label={label}>
        {tours.map((t) => (
          <li key={t.slug} className="w-72 shrink-0 snap-start">
            {withDate && t.next_batch && (
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-red">
                <CalendarCheck size={14} aria-hidden /> Next departure {formatDate(t.next_batch.starts_on)}
              </p>
            )}
            <TourCard tour={t} />
          </li>
        ))}
      </Rail>
    </section>
  );
}
