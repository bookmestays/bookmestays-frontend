import "server-only";
import { cache } from "react";
import { loadOr, loadPublic } from "./public-data";
import type { BlogCard, BlogCategory, BlogPostDetail, BlogRedirect, BlogSitemapEntry, Paginated } from "./types";

// Public blog data. Every fetch carries the "blog" tag so a publish in the admin panel
// (refreshBlogPages server action) refreshes all blog pages, the sitemap and the RSS feed at once.
export const BLOG_REVALIDATE = 300;
const opts = { revalidate: BLOG_REVALIDATE, tags: ["blog"] };

export const BLOG_PAGE_SIZE = 12;

export const getBlogPost = cache((slug: string) =>
  loadPublic<BlogPostDetail | BlogRedirect>(`/public/blog/${encodeURIComponent(slug)}`, opts),
);

export const listBlogPosts = (query: { page?: number; category?: string; tag?: string; limit?: number }) =>
  loadPublic<Paginated<BlogCard>>("/public/blog", { ...opts, query: { limit: BLOG_PAGE_SIZE, ...query } });

export const getBlogCategories = cache(() => loadOr<BlogCategory[]>("/public/blog/categories", [], opts));

export const getBlogSitemap = () => loadOr<BlogSitemapEntry[]>("/public/blog/sitemap", [], opts);

export const isRedirect = (x: BlogPostDetail | BlogRedirect): x is BlogRedirect => "redirect" in x;
