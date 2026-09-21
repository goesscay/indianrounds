import Link from "next/link";
import { Clock } from "lucide-react";
import { postTypes, type Post } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { CoverImage } from "./CoverImage";

export function typeLabel(key: string) {
  return postTypes.find((t) => t.key === key)?.label ?? "Article";
}

export function PostCard({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col overflow-hidden rounded-card bg-white shadow-float transition hover:-translate-y-1">
      <CoverImage src={post.cover_image_url} alt={post.title} seed={post.slug} className="aspect-[16/10]" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">{post.destination?.name ?? typeLabel(post.content_type)}</p>
        <h3 className="font-bold leading-snug group-hover:text-brand-red">{post.title}</h3>
        {post.excerpt && <p className="line-clamp-2 text-sm text-muted">{post.excerpt}</p>}
        <p className="mt-auto flex items-center gap-2 pt-2 text-xs text-muted">
          {post.published_at && <span>{formatDate(post.published_at.slice(0, 10))}</span>}
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1"><Clock size={12} /> {post.read_minutes} min read</span>
        </p>
      </div>
    </Link>
  );
}
