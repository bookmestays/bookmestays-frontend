import type { Metadata } from "next";
import { BlogList } from "@/components/site/blog/blog-list";
import { JsonLd, PageHeader } from "@/components/site/primitives";
import { getBlogCategories, listBlogPosts } from "@/lib/blog-data";
import { SITE_URL } from "@/lib/public-data";

const TITLE = "Travel Blog — guides, itineraries & stay tips";
const DESCRIPTION = "Travel guides, weekend getaway ideas, itineraries and tips for hotels, villas, homestays and heritage stays across India from the BookMeStays team.";

export async function generateMetadata(props: PageProps<"/blog">): Promise<Metadata> {
  const sp = await props.searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const tag = typeof sp.tag === "string" ? sp.tag : undefined;
  return {
    title: tag ? `#${tag} — Travel Blog` : page > 1 ? `${TITLE} (page ${page})` : TITLE,
    description: DESCRIPTION,
    alternates: { canonical: page > 1 ? `/blog?page=${page}` : "/blog", types: { "application/rss+xml": `${SITE_URL}/blog/rss.xml` } },
    // tag filters are thin duplicate listings — keep them out of the index, but follow their links
    robots: tag ? { index: false, follow: true } : undefined,
    openGraph: { title: "BookMeStays Travel Blog", description: DESCRIPTION, type: "website", url: "/blog" },
  };
}

export default async function BlogIndexPage(props: PageProps<"/blog">) {
  const sp = await props.searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const tag = typeof sp.tag === "string" ? sp.tag : undefined;
  const [res, categories] = await Promise.all([listBlogPosts({ page, tag }), getBlogCategories()]);
  const href = (p: number) => `/blog?${new URLSearchParams({ ...(tag ? { tag } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString()}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "BookMeStays Travel Blog",
          description: DESCRIPTION,
          url: `${SITE_URL}/blog`,
          blogPost: (res.data?.items ?? []).map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            url: `${SITE_URL}/blog/${p.slug}`,
            datePublished: p.publishedAt ?? undefined,
            image: p.coverImageUrl ?? undefined,
          })),
        }}
      />
      <PageHeader title={tag ? `Posts tagged “${tag}”` : "Travel Blog"} subtitle="Guides, getaway ideas and insider tips to plan your next stay." />
      <BlogList res={res} categories={categories} page={page} href={href} showHero={page === 1 && !tag} />
    </>
  );
}
