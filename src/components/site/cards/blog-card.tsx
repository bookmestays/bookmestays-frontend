import { Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { BlogCard as BlogCardDTO } from "@/lib/types";
import { SmartImage } from "../media/smart-image";

export function BlogCard({ post, className, large = false, priority = false }: { post: BlogCardDTO; className?: string; large?: boolean; priority?: boolean }) {
  return (
    <article className={cn("group relative flex flex-col", large && "lg:grid lg:grid-cols-2 lg:items-center lg:gap-8", className)}>
      <div className={cn("relative overflow-hidden rounded-2xl bg-surface-2", large ? "aspect-[16/10]" : "aspect-[16/10]")}>
        <SmartImage
          src={post.coverImageUrl}
          alt={post.coverImageAlt || post.title}
          fill
          sizes={large ? "(max-width: 1024px) 100vw, 640px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          {...(priority ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
        />
        {post.category && (
          <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-brand shadow-sm">{post.category}</span>
        )}
      </div>
      <div className={cn("mt-3 flex flex-col gap-1.5", large && "lg:mt-0")}>
        <h3 className={cn("line-clamp-2 leading-snug font-semibold text-ink", large ? "text-xl sm:text-2xl lg:text-3xl" : "text-[17px]")}>
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none group-focus-within:underline group-hover:text-brand">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && <p className={cn("text-sm text-ink-2", large ? "line-clamp-4 sm:text-base" : "line-clamp-2")}>{post.excerpt}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {post.publishedAt && <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>}
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden /> {post.readingMinutes} min read
          </span>
          {post.authorName && <span>By {post.authorName}</span>}
        </p>
      </div>
    </article>
  );
}
