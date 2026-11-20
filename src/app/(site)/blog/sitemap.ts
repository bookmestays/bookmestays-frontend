import type { MetadataRoute } from "next";
import { getBlogCategories, getBlogSitemap } from "@/lib/blog-data";
import { SITE_URL } from "@/lib/public-data";

// /blog/sitemap.xml — every published post (with its cover image for Google Images) and
// every category page. Listed in robots.txt; refreshed instantly when a post is published.
export const revalidate = 300;

export default async function blogSitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories] = await Promise.all([getBlogSitemap(), getBlogCategories()]);
  const newest = posts[0]?.updatedAt ? new Date(posts[0].updatedAt) : new Date();
  return [
    { url: `${SITE_URL}/blog`, lastModified: newest, changeFrequency: "daily", priority: 0.8 },
    ...categories.map((c) => ({ url: `${SITE_URL}/blog/category/${c.slug}`, lastModified: newest, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: p.coverImageUrl ? [p.coverImageUrl] : undefined,
    })),
  ];
}
