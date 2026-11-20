import { listBlogPosts } from "@/lib/blog-data";
import { escapeHtml } from "@/lib/markdown";
import { SITE_URL } from "@/lib/public-data";

// RSS 2.0 feed of the latest posts (/blog/rss.xml) — lets feed readers and aggregators pick up new posts.
export const revalidate = 300;

export async function GET() {
  const res = await listBlogPosts({ page: 1, limit: 50 });
  const posts = res.data?.items ?? [];
  const x = (s: string) => escapeHtml(s);
  const items = posts
    .map(
      (p) => `    <item>
      <title>${x(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid>
      ${p.publishedAt ? `<pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>` : ""}
      ${p.category ? `<category>${x(p.category)}</category>` : ""}
      ${p.authorName ? `<dc:creator>${x(p.authorName)}</dc:creator>` : ""}
      <description>${x(p.excerpt)}</description>
      ${p.coverImageUrl ? `<enclosure url="${x(p.coverImageUrl)}" type="image/jpeg" length="0" />` : ""}
    </item>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>BookMeStays Travel Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Travel guides, getaway ideas and stay tips from BookMeStays.</description>
    <language>en-in</language>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
    ${posts[0]?.publishedAt ? `<lastBuildDate>${new Date(posts[0].publishedAt).toUTCString()}</lastBuildDate>` : ""}
${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
