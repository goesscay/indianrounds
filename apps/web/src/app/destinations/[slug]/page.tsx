import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDestination } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { OpenQuoteButton } from "@/components/LeadModal";
import { SectionHeading } from "@/components/SectionHeading";
import { TourCard } from "@/components/TourCard";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getDestination(slug);
  if (!d) return { title: "Destination not found" };
  return {
    title: `${d.name} Tour Packages`,
    description: d.seo_content?.overview ?? `Curated ${d.name} tour packages from Indian Rounds.`,
    alternates: { canonical: `/destinations/${d.slug}` },
  };
}

const sorts = [
  { key: "popular", label: "Popular" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "duration_asc", label: "Shortest first" },
];

export default async function DestinationPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sort = "popular" } = await searchParams;
  const d = await getDestination(slug);
  if (!d) notFound();

  const tours = [...(d.tours ?? [])];
  if (sort === "price_asc") tours.sort((a, b) => a.price - b.price);
  if (sort === "price_desc") tours.sort((a, b) => b.price - a.price);
  if (sort === "duration_asc") tours.sort((a, b) => a.duration_nights - b.duration_nights);

  return (
    <>
      <section className="bg-gradient-to-r from-brand-red-dark to-brand-red text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">{d.region === "india" ? "India" : "International"}</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">{d.name} Tour Packages</h1>
          {d.tagline && <p className="mt-2 text-white/85">{d.tagline}</p>}
          {d.starting_price && <p className="mt-4 text-lg">Starting from <strong>{formatINR(d.starting_price)}</strong> per person</p>}
          <OpenQuoteButton options={{ destination: d.name, title: `Plan your ${d.name} trip` }} className="mt-6 rounded-full bg-white px-7 py-3 font-semibold text-brand-red hover:bg-white/90">
            Get a Free Quote
          </OpenQuoteButton>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading lead={`${d.name}`} accent="Tours" sub={`${tours.length} tour${tours.length === 1 ? "" : "s"} available`} />
        <nav aria-label="Sort tours" className="mb-6 flex flex-wrap gap-2">
          {sorts.map((s) => (
            <Link
              key={s.key}
              href={`/destinations/${d.slug}?sort=${s.key}`}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium ${sort === s.key ? "border-brand-red bg-brand-red text-white" : "border-black/15 hover:border-brand-red"}`}
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tours.map((t) => (
            <TourCard key={t.slug} tour={t} />
          ))}
        </div>
        {tours.length === 0 && <p className="text-muted">No tours are listed for this destination yet. Request a custom quote and we will plan one for you.</p>}

        {d.seo_content?.overview && (
          <section className="mt-14 max-w-3xl space-y-3">
            <h2 className="text-2xl font-extrabold">About {d.name} tours</h2>
            <p className="text-muted">{d.seo_content.overview}</p>
            {d.best_time && <p className="text-muted"><strong className="text-ink">Best time to visit:</strong> {d.best_time}</p>}
          </section>
        )}
      </div>
    </>
  );
}
