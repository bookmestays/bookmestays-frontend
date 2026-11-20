import { ArrowRight, CalendarDays, Clock, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BlogCard } from "@/components/site/cards/blog-card";
import { SmartImage } from "@/components/site/media/smart-image";
import { Breadcrumbs, Container, JsonLd } from "@/components/site/primitives";
import { ShareButton } from "@/components/site/property/property-client-bits";
import { ErrorState } from "@/components/ui";
import { getBlogPost, isRedirect } from "@/lib/blog-data";
import { formatDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { SITE_URL } from "@/lib/public-data";

const SITE_HOST = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return null;
  }
})();

export async function generateMetadata(props: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const { data: p } = await getBlogPost(slug);
  if (!p || isRedirect(p)) return { title: "Article not found" };
  const title = p.seo?.title || p.title;
  const description = p.seo?.description || p.excerpt;
  const image = p.seo?.ogImage || p.coverImageUrl;
  return {
    title,
    description,
    keywords: p.seo?.keywords?.length ? p.seo.keywords : p.tags.length ? p.tags : undefined,
    authors: p.authorName ? [{ name: p.authorName }] : undefined,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${p.slug}`,
      publishedTime: p.publishedAt ?? undefined,
      modifiedTime: p.updatedAt,
      authors: p.authorName ? [p.authorName] : undefined,
      section: p.category ?? undefined,
      tags: p.tags,
      images: image ? [{ url: image, alt: p.coverImageAlt ?? p.title }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}

export default async function BlogPostPage(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;
  const res = await getBlogPost(slug);
  if (res.error)
    return (
      <Container className="py-16">
        <ErrorState message="We couldn't load this article right now. Please refresh the page." />
      </Container>
    );
  if (!res.data) notFound();
  // Renamed post: send visitors and search engines to the new URL (308 permanent).
  if (isRedirect(res.data)) permanentRedirect(`/blog/${res.data.redirect}`);
  const p = res.data;
  const { html, headings } = renderMarkdown(p.content, { siteHost: SITE_HOST });
  const toc = headings.filter((h) => h.level === 2);
  const url = `${SITE_URL}/blog/${p.slug}`;
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Blog", href: "/blog" },
    ...(p.category && p.categorySlug ? [{ name: p.category, href: `/blog/category/${p.categorySlug}` }] : []),
    { name: p.title },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          headline: p.title,
          description: p.seo?.description || p.excerpt,
          image: p.coverImageUrl ? [p.coverImageUrl] : undefined,
          datePublished: p.publishedAt ?? undefined,
          dateModified: p.updatedAt,
          author: { "@type": p.authorName ? "Person" : "Organization", name: p.authorName ?? "BookMeStays" },
          publisher: { "@type": "Organization", name: "BookMeStays", logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
          articleSection: p.category ?? undefined,
          keywords: p.tags.length ? p.tags.join(", ") : undefined,
          wordCount: p.content.split(/\s+/).filter(Boolean).length,
          url,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: c.href ? `${SITE_URL}${c.href === "/" ? "" : c.href}` : url,
          })),
        }}
      />

      <Container className="py-6">
        <Breadcrumbs items={crumbs} />
        <header className="mx-auto mt-6 max-w-3xl text-center">
          {p.category && p.categorySlug && (
            <Link href={`/blog/category/${p.categorySlug}`} className="text-xs font-semibold tracking-wider text-accent uppercase hover:underline">
              {p.category}
            </Link>
          )}
          <h1 className="mt-2 text-3xl leading-tight font-bold text-ink sm:text-4xl lg:text-[2.75rem]">{p.title}</h1>
          {p.excerpt && <p className="mt-4 text-base text-ink-2 sm:text-lg">{p.excerpt}</p>}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted">
            {p.authorName && (
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-4" aria-hidden /> {p.authorName}
              </span>
            )}
            {p.publishedAt && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden /> <time dateTime={p.publishedAt}>{formatDate(p.publishedAt)}</time>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden /> {p.readingMinutes} min read
            </span>
            <ShareButton title={p.title} />
          </div>
        </header>

        {p.coverImageUrl && (
          <div className="relative mx-auto mt-8 aspect-[16/9] max-w-5xl overflow-hidden rounded-2xl bg-surface-2">
            <SmartImage src={p.coverImageUrl} alt={p.coverImageAlt || p.title} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" loading="eager" fetchPriority="high" />
          </div>
        )}

        <div className="mx-auto mt-10 grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0">
            {toc.length >= 3 && (
              <nav aria-label="In this article" className="mb-8 rounded-xl border border-line bg-surface-2 p-4 lg:hidden">
                <p className="text-sm font-semibold text-ink">In this article</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-2">
                  {toc.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="hover:text-brand hover:underline">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            {/* HTML produced by renderMarkdown: all text is escaped and only whitelisted tags are emitted. */}
            <article className="blog-prose" dangerouslySetInnerHTML={{ __html: html }} />

            {p.tags.length > 0 && (
              <ul className="mt-10 flex flex-wrap gap-2" aria-label="Tags">
                {p.tags.map((t) => (
                  <li key={t}>
                    <Link href={`/blog?tag=${encodeURIComponent(t)}`} rel="nofollow" className="rounded-full bg-surface-2 px-3 py-1 text-sm text-ink-2 hover:bg-brand-soft hover:text-brand">
                      #{t}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {p.city && (
              <Link href={`/cities/${p.city.slug}`} className="group mt-10 flex items-center justify-between gap-4 rounded-2xl bg-brand px-6 py-5 text-white hover:bg-brand-hover">
                <span>
                  <span className="block text-sm text-white/75">Planning a trip?</span>
                  <span className="block text-lg font-semibold">Explore handpicked stays in {p.city.name}</span>
                </span>
                <ArrowRight className="size-6 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            )}
          </div>

          {toc.length >= 3 && (
            <aside className="hidden lg:block">
              <nav aria-label="In this article" className="sticky top-28 rounded-xl border border-line p-4">
                <p className="text-sm font-semibold text-ink">In this article</p>
                <ol className="mt-2 space-y-2 text-sm text-ink-2">
                  {toc.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="line-clamp-2 hover:text-brand hover:underline">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          )}
        </div>

        {p.related.length > 0 && (
          <section aria-labelledby="related" className="mx-auto mt-16 max-w-5xl border-t border-line pt-10">
            <div className="flex items-end justify-between gap-4">
              <h2 id="related" className="text-2xl font-bold text-ink">
                Keep reading
              </h2>
              <Link href="/blog" className="text-sm font-medium text-brand hover:underline">
                All articles
              </Link>
            </div>
            <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {p.related.map((r) => (
                <li key={r.id}>
                  <BlogCard post={r} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </>
  );
}
