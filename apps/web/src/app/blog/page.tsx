import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Lightbulb, MapPin, Newspaper, Search, ShoppingBag, Sparkles, Utensils, X } from "lucide-react";
import { getPosts, postTypes, type Post } from "@/lib/api";
import { CoverImage } from "@/components/CoverImage";
import { OpenQuoteButton } from "@/components/LeadModal";
import { PostCard, FeaturedPost } from "@/components/PostCard";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Travel Blog",
  description: "Destination guides, things to do, where to eat and what to buy, plus planning tips for Indian travellers, from the Indian Rounds team.",
  alternates: { canonical: "/blog" },
};

type Props = { searchParams: Promise<{ type?: string; destination?: string; q?: string; page?: string }> };

const typeIcons = {
  places_to_visit: MapPin,
  things_to_do: Compass,
  places_to_eat: Utensils,
  places_to_shop: ShoppingBag,
  travel_journal: BookOpen,
  stories: Sparkles,
  news: Newspaper,
  general: Lightbulb,
} as const;

const plan = [
  { href: "/group-tours", title: "Group Tours", text: "Fixed departures with a trip captain", img: "/photos/places/georgia/gergeti-trinity-church.jpg" },
  { href: "/weekend-escapes", title: "Weekend Escapes", text: "Short breaks, easy to plan", img: "/photos/places/kerala/alleppey-houseboat.jpg" },
  { href: "/honeymoon", title: "Honeymoon", text: "Private trips planned for two", img: "/photos/places/indonesia/bali-swing-ubud.jpg" },
  { href: "/custom-trips", title: "Custom Trips", text: "Designed around you", img: "/photos/places/morocco/chefchaouen-blue-city.jpg" },
];

export default async function BlogPage({ searchParams }: Props) {
  const { type, destination, q, page } = await searchParams;
  const validType = postTypes.some((t) => t.key === type) ? type : undefined;
  const query = q?.trim().slice(0, 100) || undefined;
  const filtered = Boolean(validType || destination || query);
  const current = Math.max(1, Number(page) || 1);
  const lead = !filtered && current === 1;

  const [posts, featured] = await Promise.all([
    getPosts({ type: validType, destination, q: query, page: current > 1 ? String(current) : undefined, per_page: "12" }),
    lead ? getPosts({ featured: "1", per_page: "3" }) : Promise.resolve(null),
  ]);

  const types = posts.meta?.types ?? {};
  const destinations = posts.meta?.destinations ?? [];
  const total = Object.values(types).reduce((a, b) => a + b, 0);
  const last = posts.meta?.last_page ?? 1;

  // Three stories for the top of the page: the featured ones, topped up with the newest.
  let top: Post[] = [];
  if (lead) {
    top = [...(featured?.data ?? [])];
    for (const p of posts.data) if (top.length < 3 && !top.some((t) => t.slug === p.slug)) top.push(p);
  }
  const topSlugs = new Set(top.map((p) => p.slug));
  const grid = lead ? posts.data.filter((p) => !topSlugs.has(p.slug)) : posts.data;
  const activeDest = destinations.find((d) => d.slug === destination);

  const href = (params: Record<string, string | undefined>) => {
    const qs = new URLSearchParams(Object.entries({ type: validType, destination, q: query, ...params }).filter(([, v]) => v) as [string, string][]).toString();
    return `/blog${qs ? `?${qs}` : ""}`;
  };
  const chip = (active: boolean) => `rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${active ? "border-brand-red bg-brand-red text-white" : "border-black/15 bg-white hover:border-brand-red"}`;
  const shown = destinations.slice(0, 10);
  const more = destinations.slice(10);
  const pages = Array.from({ length: last }, (_, i) => i + 1).filter((n) => n === 1 || n === last || Math.abs(n - current) <= 1);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10">
          <CoverImage src="/photos/places/thailand/phi-phi-islands.jpg" alt="" seed="blog" className="h-full w-full" sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/60 to-black/20" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">Stories &amp; guides</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">The Indian Rounds <span className="text-amber-300">Travel Blog</span></h1>
          <p className="mt-2 max-w-xl text-white/90 sm:text-lg">Where to go, what to do, where to eat and how to plan it, written for travellers from India.</p>
          <form action="/blog" role="search" className="mt-5 flex max-w-xl overflow-hidden rounded-full bg-white shadow-lg">
            <label htmlFor="blog-q" className="sr-only">Search articles</label>
            <input id="blog-q" name="q" defaultValue={query} placeholder="Search guides: Bali, Kerala, visa, packing…" className="min-w-0 flex-1 bg-transparent px-5 py-3 text-ink outline-none placeholder:text-muted" />
            {validType && <input type="hidden" name="type" value={validType} />}
            {destination && <input type="hidden" name="destination" value={destination} />}
            <button className="m-1 flex items-center gap-2 rounded-full bg-brand-red px-5 py-2 font-semibold text-white hover:bg-brand-red-dark"><Search size={16} aria-hidden /> Search</button>
          </form>
          {total > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2 text-sm">
              <li className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur">{total} articles</li>
              <li className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur">{destinations.length} destinations</li>
              <li className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur">Free to read</li>
            </ul>
          )}
        </div>
      </section>

      <div className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <nav aria-label="Browse by topic">
            <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <li className="shrink-0"><Link href={href({ type: undefined, page: undefined })} className={`flex items-center gap-2 ${chip(!validType)}`}>All <span className="text-xs opacity-80">{total}</span></Link></li>
              {postTypes.filter((t) => (types[t.key] ?? 0) > 0).map((t) => {
                const Icon = typeIcons[t.key];
                return (
                  <li key={t.key} className="shrink-0">
                    <Link href={href({ type: t.key, page: undefined })} aria-current={validType === t.key ? "page" : undefined} className={`flex items-center gap-2 ${chip(validType === t.key)}`}>
                      <Icon size={15} aria-hidden /> {t.label} <span className="text-xs opacity-80">{types[t.key]}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {destinations.length > 0 && (
            <nav aria-label="Browse by destination" className="no-scrollbar -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-1 text-sm sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              <span className="mr-1 shrink-0 text-xs font-bold uppercase tracking-wide text-muted">Destination</span>
              <Link href={href({ destination: undefined, page: undefined })} className={`shrink-0 ${chip(!destination)}`}>Any</Link>
              {shown.map((d) => <Link key={d.slug} href={href({ destination: d.slug, page: undefined })} className={`shrink-0 ${chip(destination === d.slug)}`}>{d.name} <span className="text-xs opacity-70">{d.count}</span></Link>)}
              {more.map((d) => <Link key={d.slug} href={href({ destination: d.slug, page: undefined })} className={`shrink-0 sm:hidden ${chip(destination === d.slug)}`}>{d.name} <span className="text-xs opacity-70">{d.count}</span></Link>)}
              {more.length > 0 && (
                <details className="relative hidden sm:block">
                  <summary className={`cursor-pointer list-none ${chip(more.some((d) => d.slug === destination))} marker:hidden [&::-webkit-details-marker]:hidden`}>+{more.length} more</summary>
                  <div className="absolute left-0 top-full z-20 mt-2 flex w-80 max-w-[calc(100vw-2rem)] flex-wrap gap-2 rounded-card border border-black/10 bg-white p-3 shadow-float">
                    {more.map((d) => <Link key={d.slug} href={href({ destination: d.slug, page: undefined })} className={chip(destination === d.slug)}>{d.name} <span className="text-xs opacity-70">{d.count}</span></Link>)}
                  </div>
                </details>
              )}
            </nav>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {lead && top.length > 0 && (
          <section aria-labelledby="picks" className="mb-12">
            <h2 id="picks" className="mb-4 text-2xl font-extrabold sm:text-3xl">Editor&apos;s <span className="text-brand-red">picks</span></h2>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2"><FeaturedPost post={top[0]} size="lead" /></div>
              <div className="grid gap-4">
                {top.slice(1).map((p) => <FeaturedPost key={p.slug} post={p} />)}
              </div>
            </div>
          </section>
        )}

        <section aria-labelledby="latest">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 id="latest" className="text-2xl font-extrabold sm:text-3xl">
              {filtered ? "Matching " : "Latest "}<span className="text-brand-red">articles</span>
            </h2>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted" aria-live="polite">
              {posts.meta?.total ?? posts.data.length} found
              {query && <span className="rounded-full bg-surface-alt px-3 py-1 font-medium text-ink">&ldquo;{query}&rdquo;</span>}
              {activeDest && <span className="rounded-full bg-surface-alt px-3 py-1 font-medium text-ink">{activeDest.name}</span>}
              {filtered && <Link href="/blog" className="inline-flex items-center gap-1 font-semibold text-brand-red hover:underline"><X size={14} aria-hidden /> Clear filters</Link>}
            </p>
          </div>

          {grid.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {grid.map((p) => <li key={p.slug}><PostCard post={p} /></li>)}
            </ul>
          ) : (
            <div className="rounded-card bg-surface-alt p-8 text-center">
              <p className="text-lg font-bold">No articles match these filters yet</p>
              <p className="mt-1 text-sm text-muted">Try another topic or destination, or tell us what you would like to read about.</p>
              <Link href="/blog" className="mt-4 inline-block rounded-full border border-brand-red px-6 py-2.5 font-semibold text-brand-red hover:bg-brand-red hover:text-white">See all articles</Link>
            </div>
          )}

          {last > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2 text-sm">
              {current > 1 && <Link href={href({ page: current === 2 ? undefined : String(current - 1) })} className={chip(false)}>← Newer</Link>}
              {pages.map((n, i) => (
                <span key={n} className="flex items-center gap-2">
                  {i > 0 && n - pages[i - 1] > 1 && <span className="text-muted" aria-hidden>…</span>}
                  <Link href={href({ page: n === 1 ? undefined : String(n) })} aria-current={n === current ? "page" : undefined} className={chip(n === current)}>{n}</Link>
                </span>
              ))}
              {current < last && <Link href={href({ page: String(current + 1) })} className={chip(false)}>Older →</Link>}
            </nav>
          )}
        </section>
      </div>

      <section className="bg-surface-alt">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Ready to <span className="text-brand-red">go</span>?</h2>
          <p className="mt-1 text-sm text-muted">Turn a guide into a trip. Pick the way you like to travel.</p>
          <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {plan.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="group relative isolate flex aspect-[4/3] overflow-hidden rounded-2xl bg-ink text-white">
                  <div className="absolute inset-0 -z-10 transition duration-500 group-hover:scale-105">
                    <CoverImage src={p.img} alt="" seed={p.title} className="h-full w-full" sizes="(min-width: 1024px) 25vw, 50vw" />
                  </div>
                  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 to-transparent" aria-hidden />
                  <div className="mt-auto p-4">
                    <h3 className="flex items-center gap-1.5 font-extrabold">{p.title} <ArrowRight size={16} className="transition group-hover:translate-x-1" aria-hidden /></h3>
                    <p className="hidden text-xs text-white/85 sm:block">{p.text}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-gradient-to-r from-brand-red-dark to-brand-red text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-3xl font-extrabold">Not sure where to start?</h2>
            <p className="mt-1 text-sm text-white/85">Tell us your dates and budget and we will suggest the right trip.</p>
          </div>
          <OpenQuoteButton className="rounded-full bg-white px-8 py-3.5 font-semibold text-brand-red hover:bg-white/90">Get a Free Quote</OpenQuoteButton>
        </div>
      </section>
    </>
  );
}
