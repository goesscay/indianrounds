import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { getPost } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { site } from "@/lib/site";
import { CoverImage } from "@/components/CoverImage";
import { Markdown } from "@/components/Markdown";
import { OpenQuoteButton } from "@/components/LeadModal";
import { PostCard, typeLabel } from "@/components/PostCard";
import { SectionHeading } from "@/components/SectionHeading";

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
    openGraph: { type: "article", title: p.title, description: p.excerpt ?? undefined, publishedTime: p.published_at ?? undefined },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.published_at ?? undefined,
    author: { "@type": "Person", name: post.author_name },
    publisher: { "@type": "Organization", name: site.name },
    mainEntityOfPage: `${site.url}/blog/${post.slug}`,
    ...(post.cover_image_url ? { image: post.cover_image_url } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
          <Link href="/blog" className="hover:text-brand-red">Blog</Link> / <span>{typeLabel(post.content_type)}</span>
        </nav>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
          {post.destination ? <Link href={`/destinations/${post.destination.slug}`}>{post.destination.name}</Link> : typeLabel(post.content_type)}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold leading-tight sm:text-5xl">{post.title}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>By {post.author_name}</span>
          {post.published_at && <><span aria-hidden>·</span><time dateTime={post.published_at}>{formatDate(post.published_at.slice(0, 10))}</time></>}
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1"><Clock size={14} /> {post.read_minutes} min read</span>
        </p>
        <CoverImage src={post.cover_image_url} alt={post.title} seed={post.slug} className="mt-6 aspect-[16/9] rounded-card" />
        <div className="mt-8">
          <Markdown source={post.body ?? ""} />
        </div>

        <aside className="mt-12 rounded-card bg-surface-alt p-6 text-center">
          <h2 className="text-xl font-extrabold">Want help planning {post.destination ? post.destination.name : "your trip"}?</h2>
          <p className="mt-1 text-sm text-muted">Tell us your dates and we will suggest the right tour.</p>
          <OpenQuoteButton options={{ destination: post.destination?.name, title: "Plan your trip" }} className="mt-4 rounded-full bg-brand-red px-7 py-3 font-semibold text-white hover:bg-brand-red-dark">
            Get a Free Quote
          </OpenQuoteButton>
        </aside>
      </article>

      {post.related && post.related.length > 0 && (
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <SectionHeading lead="Keep" accent="Reading" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {post.related.map((p) => <PostCard key={p.slug} post={p} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
