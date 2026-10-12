import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDestination, getMenuCountry, getPosts } from "@/lib/api";
import { DestinationAttractions, DestinationCta, DestinationExperiences, DestinationFaqs, DestinationHero, DestinationNav, DestinationOverview, DestinationTips, sectionsOf } from "@/components/DestinationProfile";
import { SeasonGuide } from "@/components/SeasonGuide";
import { CategoryCard } from "@/components/MenuViews";
import { PostCard } from "@/components/PostCard";
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
  const [d, posts, menu] = await Promise.all([getDestination(slug), getPosts({ destination: slug, per_page: "3" }), getMenuCountry("destinations", slug)]);
  if (!d) notFound();

  const tours = [...(d.tours ?? [])];
  // Packages without a visible price (quote only) always sort last.
  const byPrice = (dir: 1 | -1) => (a: (typeof tours)[number], b: (typeof tours)[number]) => (a.price === null ? 1 : b.price === null ? -1 : dir * (a.price - b.price));
  if (sort === "price_asc") tours.sort(byPrice(1));
  if (sort === "price_desc") tours.sort(byPrice(-1));
  if (sort === "duration_asc") tours.sort((a, b) => a.duration_nights - b.duration_nights);

  const sections = sectionsOf(d, tours.length > 0 || Boolean(menu?.data.length));

  return (
    <>
      <DestinationHero destination={d} packageCount={tours.length} />
      <DestinationNav name={d.name} sections={sections} />

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <DestinationOverview destination={d} />

        <div id="season" className="scroll-mt-32 lg:scroll-mt-[156px] [&>section]:mb-0">
          <SeasonGuide destination={d} />
        </div>

        <section id="packages" className="scroll-mt-32 space-y-12 lg:scroll-mt-[156px]">
          {menu && menu.data.length > 0 && (
            <div>
              <SectionHeading lead="Browse by" accent="Category" sub={`${menu.data.length} categor${menu.data.length === 1 ? "y" : "ies"} in ${d.name}`} />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {menu.data.map((c) => (
                  <CategoryCard key={c.slug} href={`/destinations/${d.slug}/${c.slug}`} category={c} />
                ))}
              </div>
            </div>
          )}
          <div>
            <SectionHeading lead={`${d.name}`} accent="Tour Packages" sub={`${tours.length} package${tours.length === 1 ? "" : "s"} available`} />
            <nav aria-label="Sort tours" className="mb-6 flex flex-wrap gap-2">
              {sorts.map((s) => (
                <Link
                  key={s.key}
                  href={`/destinations/${d.slug}?sort=${s.key}#packages`}
                  scroll={false}
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
          </div>
        </section>

        <DestinationAttractions destination={d} />
        <DestinationExperiences destination={d} />
        <DestinationTips destination={d} />
        <DestinationFaqs destination={d} />

        {posts.data.length > 0 && (
          <section>
            <SectionHeading lead={`${d.name}`} accent="Travel Guides" href={`/blog?destination=${d.slug}`} cta="More guides" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.data.map((p) => <PostCard key={p.slug} post={p} />)}
            </div>
          </section>
        )}

        <DestinationCta destination={d} />
      </div>
    </>
  );
}
