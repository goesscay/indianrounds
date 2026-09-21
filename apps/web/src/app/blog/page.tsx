import type { Metadata } from "next";
import Link from "next/link";
import { getDestinations, getPosts, postTypes } from "@/lib/api";
import { PostCard } from "@/components/PostCard";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Travel Blog",
  description: "Destination guides, things to do, where to eat and travel stories from the Indian Rounds team.",
  alternates: { canonical: "/blog" },
};

type Props = { searchParams: Promise<{ type?: string; destination?: string; page?: string }> };

export default async function BlogPage({ searchParams }: Props) {
  const { type, destination, page } = await searchParams;
  const validType = postTypes.some((t) => t.key === type) ? type : undefined;
  const [posts, destinations] = await Promise.all([
    getPosts({ type: validType, destination, page, per_page: "12" }),
    getDestinations(),
  ]);
  const current = posts.meta?.current_page ?? 1;
  const last = posts.meta?.last_page ?? 1;

  const href = (params: Record<string, string | undefined>) => {
    const qs = new URLSearchParams(Object.entries({ type: validType, destination, ...params }).filter(([, v]) => v) as [string, string][]).toString();
    return `/blog${qs ? `?${qs}` : ""}`;
  };
  const chip = (active: boolean) => `rounded-full border px-4 py-1.5 text-sm font-medium ${active ? "border-brand-red bg-brand-red text-white" : "border-black/15 hover:border-brand-red"}`;

  return (
    <>
      <section className="bg-gradient-to-r from-brand-red-dark to-brand-red text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">Stories &amp; guides</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">The Indian Rounds Travel Blog</h1>
          <p className="mt-2 max-w-xl text-white/85">Where to go, what to do, where to eat — and stories from the road.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Filter by type" className="flex flex-wrap gap-2">
          <Link href={href({ type: undefined, page: undefined })} className={chip(!validType)}>All</Link>
          {postTypes.map((t) => (
            <Link key={t.key} href={href({ type: t.key, page: undefined })} className={chip(validType === t.key)}>{t.label}</Link>
          ))}
        </nav>
        <nav aria-label="Filter by destination" className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href={href({ destination: undefined, page: undefined })} className={chip(!destination)}>Any destination</Link>
          {destinations.map((d) => (
            <Link key={d.slug} href={href({ destination: d.slug, page: undefined })} className={chip(destination === d.slug)}>{d.name}</Link>
          ))}
        </nav>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.data.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
        {posts.data.length === 0 && <p className="mt-8 text-muted">No articles match these filters yet.</p>}

        {last > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3 text-sm">
            {current > 1 && <Link href={href({ page: String(current - 1) })} className={chip(false)}>← Newer</Link>}
            <span className="text-muted">Page {current} of {last}</span>
            {current < last && <Link href={href({ page: String(current + 1) })} className={chip(false)}>Older →</Link>}
          </nav>
        )}
      </div>
    </>
  );
}
