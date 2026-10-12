import Link from "next/link";
import { Clock } from "lucide-react";
import { postTypes, type Post } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { CoverImage } from "./CoverImage";

export function typeLabel(key: string) {
  return postTypes.find((t) => t.key === key)?.label ?? "Article";
}

function Meta({ post, className = "" }: { post: Post; className?: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-xs ${className}`}>
      {post.published_at && <time dateTime={post.published_at}>{formatDate(post.published_at.slice(0, 10))}</time>}
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1"><Clock size={12} aria-hidden /> {post.read_minutes} min read</span>
    </p>
  );
}

/** Compact article card for grids. */
export function PostCard({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-float">
      <div className="relative">
        <CoverImage src={post.cover_image_url} alt={post.title} seed={post.slug} className="aspect-[16/10]" sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 100vw" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-red shadow-sm">{typeLabel(post.content_type)}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {post.destination && <p className="text-xs font-semibold text-muted">{post.destination.name}</p>}
        <h3 className="line-clamp-2 font-bold leading-snug group-hover:text-brand-red">{post.title}</h3>
        {post.excerpt && <p className="line-clamp-2 text-sm text-muted">{post.excerpt}</p>}
        <Meta post={post} className="mt-auto pt-2 text-muted" />
      </div>
    </Link>
  );
}

/** Photo-led card with the title over the picture: the lead story is big, the side stories are smaller. */
export function FeaturedPost({ post, size = "side" }: { post: Post; size?: "lead" | "side" }) {
  const lead = size === "lead";
  return (
    <Link href={`/blog/${post.slug}`} className={`group relative isolate flex h-full overflow-hidden rounded-2xl bg-ink text-white shadow-sm ${lead ? "min-h-[22rem] lg:min-h-[28rem]" : "min-h-[13rem]"}`}>
      <div className="absolute inset-0 -z-10 transition duration-700 group-hover:scale-105">
        <CoverImage src={post.cover_image_url} alt="" seed={post.slug} className="h-full w-full" sizes={lead ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 30vw, 100vw"} />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent" aria-hidden />
      <div className={`mt-auto w-full ${lead ? "p-6 sm:p-8" : "p-5"}`}>
        <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
          <span className="rounded-full bg-brand-red px-2.5 py-1">{typeLabel(post.content_type)}</span>
          {post.destination && <span className="text-white/90">{post.destination.name}</span>}
        </p>
        <h3 className={`mt-2 font-extrabold leading-tight ${lead ? "text-2xl sm:text-4xl" : "line-clamp-3 text-lg"}`}>{post.title}</h3>
        {lead && post.excerpt && <p className="mt-2 line-clamp-2 max-w-2xl text-white/85">{post.excerpt}</p>}
        <Meta post={post} className="mt-3 text-white/80" />
      </div>
    </Link>
  );
}
