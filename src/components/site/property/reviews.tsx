"use client";

import { MessageSquareQuote } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Paginated, PropertyDetail, Review } from "@/lib/types";
import { Stars } from "../primitives";

function ReviewItem({ r }: { r: Review }) {
  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-ink">
            {r.authorName.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{r.authorName}</p>
            <p className="text-xs text-muted">
              {r.stayMonth ? `Stayed ${formatDate(`${r.stayMonth}-01`, { month: "long", year: "numeric" })}` : formatDate(r.createdAt)}
            </p>
          </div>
        </div>
        <Stars value={r.rating} />
      </div>
      {r.title && <p className="mt-3 font-medium text-ink">{r.title}</p>}
      {r.body && <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink-2">{r.body}</p>}
      {r.partnerReply && (
        <div className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
          <p className="text-xs font-semibold text-ink">Response from the property</p>
          <p className="mt-1 text-ink-2">{r.partnerReply}</p>
        </div>
      )}
    </li>
  );
}

export function Reviews({ slug, summary, initial }: { slug: string; summary: PropertyDetail["reviewSummary"]; initial: Review[] }) {
  const [reviews, setReviews] = useState<Review[]>(initial);
  const [page, setPage] = useState(0); // 0 = only the "top reviews" from the detail payload
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadMore = async () => {
    setLoading(true);
    setError(false);
    try {
      const next = page + 1;
      const res = await api<Paginated<Review>>(`/public/properties/${slug}/reviews`, { query: { page: next } });
      setReviews((prev) => {
        const base = next === 1 ? [] : prev;
        const seen = new Set(base.map((r) => r.id));
        return [...base, ...res.items.filter((r) => !seen.has(r.id))];
      });
      setPage(next);
      setTotalPages(res.totalPages);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (summary.count === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-line p-6 text-sm text-muted">
        <MessageSquareQuote className="size-6" aria-hidden />
        No reviews yet — guests who stay here can review after check-out.
      </div>
    );
  }

  const hasMore = totalPages === null ? summary.count > reviews.length : page < totalPages;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="rounded-xl bg-surface-2 p-5">
        <p className="text-4xl font-bold text-ink">{summary.avg.toFixed(1)}</p>
        <Stars value={summary.avg} className="mt-1" />
        <p className="mt-1 text-sm text-muted">{summary.count.toLocaleString("en-IN")} verified reviews</p>
        <ul className="mt-4 space-y-1.5">
          {(["5", "4", "3", "2", "1"] as const).map((k) => {
            const n = summary.distribution?.[k] ?? 0;
            const pct = summary.count ? Math.round((n / summary.count) * 100) : 0;
            return (
              <li key={k} className="flex items-center gap-2 text-xs text-ink-2">
                <span className="w-3">{k}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
                  <span className="block h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-8 text-right text-muted">{n}</span>
                <span className="sr-only">
                  {n} reviews with {k} stars
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <ul className="space-y-3">
          {reviews.map((r) => (
            <ReviewItem key={r.id} r={r} />
          ))}
        </ul>
        {error && <p className="mt-3 text-sm text-danger">Couldn&apos;t load more reviews. Please try again.</p>}
        {hasMore && (
          <Button variant="outline" className="mt-4" onClick={loadMore} loading={loading}>
            Show more reviews
          </Button>
        )}
      </div>
    </div>
  );
}
