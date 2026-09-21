import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollection, getCollections } from "@/lib/api";
import { OpenQuoteButton } from "@/components/LeadModal";
import { SectionHeading } from "@/components/SectionHeading";
import { TourCard } from "@/components/TourCard";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCollection(slug);
  if (!c) return { title: "Collection not found" };
  return { title: c.title, description: c.intro, alternates: { canonical: `/collections/${c.slug}` } };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const [c, all] = await Promise.all([getCollection(slug), getCollections()]);
  if (!c) notFound();

  return (
    <>
      <section className="bg-gradient-to-r from-brand-red-dark to-brand-red text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">Curated collection</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">{c.title}</h1>
          <p className="mt-2 max-w-2xl text-white/85">{c.intro}</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading lead="Upcoming" accent="Departures" sub={`${c.tours.length} tour${c.tours.length === 1 ? "" : "s"} available`} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {c.tours.map((t) => <TourCard key={t.slug} tour={t} />)}
        </div>
        {c.tours.length === 0 && (
          <div className="rounded-card bg-surface-alt p-8 text-center">
            <p className="text-muted">No departures are listed here right now.</p>
            <OpenQuoteButton options={{ title: `Plan a ${c.title.toLowerCase()} trip` }} className="mt-4 rounded-full bg-brand-red px-7 py-3 font-semibold text-white hover:bg-brand-red-dark">
              Tell us what you want
            </OpenQuoteButton>
          </div>
        )}

        <nav aria-label="More collections" className="mt-14 flex flex-wrap gap-2">
          {all.filter((x) => x.slug !== c.slug).map((x) => (
            <Link key={x.slug} href={`/collections/${x.slug}`} className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-medium hover:border-brand-red">
              {x.title}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
