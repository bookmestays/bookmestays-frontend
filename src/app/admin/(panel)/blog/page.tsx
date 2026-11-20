"use client";
/* eslint-disable @next/next/no-img-element -- arbitrary storage hosts */

import Link from "next/link";
import { ExternalLink, FileText, Plus } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import type { AdminBlogPost, Paginated } from "@/lib/types";
import { Badge, buttonClass } from "@/components/ui";
import { PageHeader } from "@/components/panel/page";
import { DataTable, useUrlPagination } from "@/components/panel/data-table";
import { FiltersBar, SearchFilter, UrlTabs } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";
import { blogPostUrl, BlogStatusBadge } from "../../_components/blog-editor";

export default function BlogListPage() {
  const { get, query } = useUrlParams();
  const tab = get("tab") || "all";
  const { tab: _t, ...rest } = query;
  void _t;
  const status = tab === "drafts" ? "DRAFT" : tab === "published" ? "PUBLISHED" : tab === "scheduled" ? "SCHEDULED" : undefined;
  const { data, error, loading, refetch } = useApi<Paginated<AdminBlogPost>>("/admin/blog", { limit: 20, ...rest, status });
  const pagination = useUrlPagination(data);

  return (
    <>
      <PageHeader
        title="Blog"
        description="Write travel guides and stories. Published posts get their own page at /blog/<url-slug>, are added to the sitemap and the RSS feed automatically."
        actions={
          <Link href="/admin/blog/new" className={buttonClass("primary")}>
            <Plus className="size-4" /> New post
          </Link>
        }
      />
      <UrlTabs
        tabs={[
          { value: "all", label: "All posts" },
          { value: "published", label: "Published" },
          { value: "scheduled", label: "Scheduled" },
          { value: "drafts", label: "Drafts" },
        ]}
      />
      <FiltersBar>
        <SearchFilter placeholder="Search title or slug…" />
      </FiltersBar>
      <DataTable<AdminBlogPost>
        rows={data?.items}
        rowKey={(p) => p.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        pagination={pagination}
        rowHref={(p) => `/admin/blog/${p.id}`}
        columns={[
          {
            key: "title",
            header: "Post",
            cell: (p) => (
              <div className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2">
                  {p.coverImageUrl ? <img src={p.coverImageUrl} alt="" className="size-full object-cover" /> : <FileText className="size-5 text-muted" aria-hidden />}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 font-medium text-ink">{p.title}</p>
                  <p className="truncate text-xs text-muted">/blog/{p.slug}</p>
                </div>
              </div>
            ),
            sortValue: (p) => p.title,
          },
          { key: "category", header: "Category", cell: (p) => p.category ?? "—", hideBelow: "md" },
          { key: "author", header: "Author", cell: (p) => p.authorName ?? "—", hideBelow: "lg" },
          {
            key: "status",
            header: "Status",
            cell: (p) => (
              <div className="flex flex-wrap gap-1">
                <BlogStatusBadge post={p} />
                {p.isFeatured && <Badge tone="warning">Featured</Badge>}
              </div>
            ),
          },
          {
            key: "date",
            header: "Published / updated",
            cell: (p) => (
              <div className="text-sm">
                <p className="text-ink">{p.publishedAt ? formatDate(p.publishedAt) : "—"}</p>
                <p className="text-xs text-muted">Edited {formatDate(p.updatedAt)}</p>
              </div>
            ),
            sortValue: (p) => p.publishedAt ?? p.updatedAt,
            hideBelow: "sm",
          },
          {
            key: "view",
            header: <span className="sr-only">View</span>,
            align: "right",
            cell: (p) =>
              p.status === "PUBLISHED" && p.publishedAt && new Date(p.publishedAt) <= new Date() ? (
                <a
                  href={blogPostUrl(p.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                >
                  View <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : null,
          },
        ]}
        empty={{ title: "No blog posts yet", description: "Click “New post” to write your first article." }}
      />
    </>
  );
}
