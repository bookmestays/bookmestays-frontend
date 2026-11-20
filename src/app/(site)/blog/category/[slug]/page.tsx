import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogList } from "@/components/site/blog/blog-list";
import { Breadcrumbs, JsonLd, PageHeader } from "@/components/site/primitives";
import { getBlogCategories, listBlogPosts } from "@/lib/blog-data";
import { SITE_URL } from "@/lib/public-data";

export async function generateMetadata(props: PageProps<"/blog/category/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const page = Math.max(1, Number((await props.searchParams).page) || 1);
  const cat = (await getBlogCategories()).find((c) => c.slug === slug);
  if (!cat) return { title: "Category not found" };
  const title = `${cat.name} — Travel Blog${page > 1 ? ` (page ${page})` : ""}`;
  const description = `${cat.count} article${cat.count === 1 ? "" : "s"} on ${cat.name.toLowerCase()} from the BookMeStays travel blog.`;
  return { title, description, alternates: { canonical: `/blog/category/${slug}${page > 1 ? `?page=${page}` : ""}` }, openGraph: { title, description, url: `/blog/category/${slug}` } };
}

export default async function BlogCategoryPage(props: PageProps<"/blog/category/[slug]">) {
  const { slug } = await props.params;
  const page = Math.max(1, Number((await props.searchParams).page) || 1);
  const [categories, res] = await Promise.all([getBlogCategories(), listBlogPosts({ page, category: slug })]);
  const cat = categories.find((c) => c.slug === slug);
  if (!cat && !res.error) notFound();
  const name = cat?.name ?? slug;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
            { "@type": "ListItem", position: 3, name, item: `${SITE_URL}/blog/category/${slug}` },
          ],
        }}
      />
      <PageHeader title={name} subtitle={`Articles about ${name.toLowerCase()} from the BookMeStays travel blog.`}>
        <div className="mb-3">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }, { name }]} />
        </div>
      </PageHeader>
      <BlogList res={res} categories={categories} activeCategory={slug} page={page} href={(p) => `/blog/category/${slug}${p > 1 ? `?page=${p}` : ""}`} />
    </>
  );
}
