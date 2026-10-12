import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, ListTree, Mail, MapPin, MessageCircle, Share2 } from "lucide-react";
import { getPost, getTours, type Post } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format";
import { site } from "@/lib/site";
import { CoverImage } from "@/components/CoverImage";
import { Markdown, headingsOf } from "@/components/Markdown";
import { OpenQuoteButton } from "@/components/LeadModal";
import { Breadcrumbs } from "@/components/MenuViews";
import { PostCard, typeLabel } from "@/components/PostCard";
import { SectionHeading } from "@/components/SectionHeading";
import { TourCard } from "@/components/TourCard";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) return { title: "Article not found" };
  return {
    title: p.title,
    description: p.meta_description ?? p.excerpt ?? undefined,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: "article", title: p.title, description: p.excerpt ?? undefined, publishedTime: p.published_at ?? undefined, ...(p.cover_image_url ? { images: [p.cover_image_url] } : {}) },
  };
}

function Facts({ facts }: { facts: NonNullable<Post["key_facts"]> }) {
  return (
    <section aria-labelledby="facts-h" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <h2 id="facts-h" className="text-sm font-extrabold uppercase tracking-wide text-brand-red">Quick facts</h2>
      <dl className="mt-3 divide-y divide-black/5 text-sm">
        {facts.map((f) => (
          <div key={f.label} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2 first:pt-0 last:pb-0">
            <dt className="font-semibold text-muted">{f.label}</dt>
            <dd className="font-medium">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Contents({ headings }: { headings: { id: string; text: string }[] }) {
  return (
    <nav aria-label="In this article" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-brand-red"><ListTree size={15} aria-hidden /> In this article</h2>
      <ol className="mt-3 space-y-1.5 text-sm">
        {headings.map((h, i) => (
          <li key={h.id} className="flex gap-2">
            <span className="text-muted">{i + 1}.</span>
            <a href={`#${h.id}`} className="font-medium hover:text-brand-red">{h.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const tours = post.destination ? (await getTours({ destination: post.destination.slug, per_page: "4" })).data : [];
  const headings = headingsOf(post.body ?? "");
  const facts = post.key_facts ?? [];
  const url = `${site.url}/blog/${post.slug}`;
  const share = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}`, icon: MessageCircle },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, icon: Share2 },
    { label: "Email", href: `mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(url)}`, icon: Mail },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.published_at ?? undefined,
    author: { "@type": "Person", name: post.author_name },
    publisher: { "@type": "Organization", name: site.name },
    mainEntityOfPage: url,
    ...(post.cover_image_url ? { image: post.cover_image_url.startsWith("/") ? `${site.url}${post.cover_image_url}` : post.cover_image_url } : {}),
  };

  const planCard = (
    <section aria-labelledby="plan-h" className="rounded-2xl bg-gradient-to-br from-brand-red-dark to-brand-red p-5 text-white shadow-sm">
      <h2 id="plan-h" className="text-lg font-extrabold">Plan {post.destination ? post.destination.name : "your trip"} with us</h2>
      <p className="mt-1 text-sm text-white/85">Tell us your dates and budget and we will suggest the right trip.</p>
      {tours.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm">
          {tours.slice(0, 3).map((t) => (
            <li key={t.slug}>
              <Link href={`/tours/${t.slug}`} className="group flex items-start justify-between gap-3 rounded-xl bg-white/10 px-3 py-2 hover:bg-white/20">
                <span className="line-clamp-2 font-semibold">{t.title}</span>
                <span className="shrink-0 text-xs text-white/85">{t.price !== null ? `from ${formatINR(t.price)}` : "On request"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <OpenQuoteButton options={{ destination: post.destination?.name, title: "Plan your trip" }} className="mt-4 w-full rounded-full bg-white px-6 py-3 font-semibold text-brand-red hover:bg-white/90">
        Get a Free Quote
      </OpenQuoteButton>
    </section>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <header className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10">
          <CoverImage src={post.cover_image_url} alt="" seed={post.slug} className="h-full w-full" sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/55 to-black/30" aria-hidden />
        <div className="mx-auto flex min-h-[18rem] max-w-6xl flex-col justify-end px-4 pb-8 pt-8 sm:px-6 lg:min-h-[24rem] lg:px-8">
          <Breadcrumbs items={[{ label: "Blog", href: "/blog" }, { label: typeLabel(post.content_type) }]} />
          <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <Link href={`/blog?type=${post.content_type}`} className="rounded-full bg-brand-red px-3 py-1 hover:bg-brand-red-dark">{typeLabel(post.content_type)}</Link>
            {post.destination && <Link href={`/destinations/${post.destination.slug}`} className="inline-flex items-center gap-1 text-white/90 hover:underline"><MapPin size={13} aria-hidden /> {post.destination.name}</Link>}
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight sm:text-5xl">{post.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/85">
            <span>By {post.author_name}</span>
            {post.published_at && <><span aria-hidden>·</span><time dateTime={post.published_at}>{formatDate(post.published_at.slice(0, 10))}</time></>}
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden /> {post.read_minutes} min read</span>
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <article className="min-w-0">
          {post.excerpt && <p className="border-l-4 border-brand-red pl-4 text-lg font-medium leading-relaxed text-ink/90">{post.excerpt}</p>}

          <div className="mt-6 space-y-4 lg:hidden">
            {facts.length > 0 && <Facts facts={facts} />}
            {headings.length >= 3 && (
              <details className="rounded-2xl border border-black/10 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-extrabold uppercase tracking-wide text-brand-red marker:hidden [&::-webkit-details-marker]:hidden"><ListTree size={15} aria-hidden /> In this article</summary>
                <ol className="space-y-1.5 border-t border-black/5 px-5 py-4 text-sm">
                  {headings.map((h, i) => <li key={h.id} className="flex gap-2"><span className="text-muted">{i + 1}.</span><a href={`#${h.id}`} className="font-medium">{h.text}</a></li>)}
                </ol>
              </details>
            )}
          </div>

          <div className="mt-6">
            <Markdown source={post.body ?? ""} />
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-black/10 pt-5 text-sm">
            <span className="font-semibold">Share this guide</span>
            {share.map(({ label, href, icon: Icon }) => (
              <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3.5 py-1.5 font-medium hover:border-brand-red hover:text-brand-red">
                <Icon size={15} aria-hidden /> {label}
              </a>
            ))}
          </div>

          <p className="mt-6 rounded-2xl bg-surface-alt px-5 py-4 text-sm text-muted">
            Written by the {post.author_name}. Travel rules, prices and conditions change, so please check current details with the official source or ask us before you book.
          </p>

          <div className="mt-8 lg:hidden">{planCard}</div>
        </article>

        <aside aria-label="Article extras" className="hidden lg:block">
          <div className="sticky top-28 space-y-5">
            {facts.length > 0 && <Facts facts={facts} />}
            {headings.length >= 3 && <Contents headings={headings} />}
            {planCard}
          </div>
        </aside>
      </div>

      {tours.length > 0 && post.destination && (
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <SectionHeading lead="Trips to" accent={post.destination.name} sub="Ready-made packages you can book or change to suit you" href={`/destinations/${post.destination.slug}`} cta="See all" />
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {tours.slice(0, 4).map((t) => <li key={t.slug} className="contents"><TourCard tour={t} /></li>)}
            </ul>
          </div>
        </section>
      )}

      {post.related && post.related.length > 0 && (
        <section>
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <SectionHeading lead="Keep" accent="Reading" href="/blog" cta="All articles" />
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {post.related.map((p) => <li key={p.slug}><PostCard post={p} /></li>)}
            </ul>
            <p className="mt-6 text-center text-sm"><Link href="/blog" className="inline-flex items-center gap-1 font-semibold text-brand-red hover:underline">Back to the blog <ArrowRight size={14} aria-hidden /></Link></p>
          </div>
        </section>
      )}
    </>
  );
}
