import { Newspaper } from "lucide-react";
import Link from "next/link";
import { BlogCard } from "@/components/site/cards/blog-card";
import { Container } from "@/components/site/primitives";
import { Pagination } from "@/components/site/search/search-view";
import { EmptyState, ErrorState } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Loaded } from "@/lib/public-data";
import type { BlogCard as BlogCardDTO, BlogCategory, Paginated } from "@/lib/types";

/** Category chips + post grid + pagination, shared by /blog and /blog/category/[slug]. */
export function BlogList({
  res,
  categories,
  activeCategory,
  page,
  href,
  showHero,
}: {
  res: Loaded<Paginated<BlogCardDTO>>;
  categories: BlogCategory[];
  activeCategory?: string;
  page: number;
  href: (page: number) => string;
  /** first page of the unfiltered index: show the featured / newest post large */
  showHero?: boolean;
}) {
  const chip = "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium";
  const items = res.data?.items ?? [];
  const hero = showHero ? (items.find((p) => p.isFeatured) ?? items[0]) : undefined;
  const rest = hero ? items.filter((p) => p.id !== hero.id) : items;

  return (
    <Container className="py-6 sm:py-8">
      {categories.length > 0 && (
        <nav aria-label="Blog categories" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <Link href="/blog" aria-current={!activeCategory ? "page" : undefined} className={cn(chip, !activeCategory ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:border-ink")}>
            All posts
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/blog/category/${c.slug}`}
              aria-current={activeCategory === c.slug ? "page" : undefined}
              className={cn(chip, activeCategory === c.slug ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:border-ink")}
            >
              {c.name} <span className="opacity-60">{c.count}</span>
            </Link>
          ))}
        </nav>
      )}
      <div className="mt-6">
        {res.error ? (
          <ErrorState message="We couldn't load the blog right now. Please refresh the page." />
        ) : items.length === 0 ? (
          <EmptyState icon={<Newspaper />} title="No posts yet" description="Fresh travel guides and stories are on their way. Check back soon!" className="rounded-xl border border-dashed border-line" />
        ) : (
          <>
            {hero && <BlogCard post={hero} large priority className="mb-10 border-b border-line pb-10" />}
            <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p, i) => (
                <li key={p.id}>
                  <BlogCard post={p} priority={!hero && i < 3} />
                </li>
              ))}
            </ul>
            {res.data!.totalPages > 1 && <Pagination page={page} totalPages={res.data!.totalPages} href={href} />}
          </>
        )}
      </div>
    </Container>
  );
}
