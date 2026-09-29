"use client";

import { useState } from "react";
import { MessageSquareText, Star } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import type { Paginated, PartnerPropertyRow } from "@/lib/types";
import type { PartnerReview } from "@/lib/panel-types";
import { Button, Card, EmptyState, ErrorState, Field, Skeleton, Textarea, useToast } from "@/components/ui";
import { PageHeader } from "@/components/panel/page";
import { PaginationBar } from "@/components/panel/data-table";
import { FiltersBar, SelectFilter } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";
import { StatusBadge } from "@/components/panel/status-badge";
import { RequirePermission } from "../../_components/require";

export default function PartnerReviewsPage() {
  return (
    <RequirePermission perm="reviews">
      <Reviews />
    </RequirePermission>
  );
}

function Reviews() {
  const { get, page, set } = useUrlParams();
  const props = useApi<PartnerPropertyRow[]>("/partner/properties");
  const { data, error, loading, refetch } = useApi<Paginated<PartnerReview>>("/partner/reviews", { propertyId: get("propertyId"), page, limit: 20 });
  return (
    <>
      <PageHeader title="Reviews" description="What guests say about their stay. A thoughtful reply builds trust with future guests." />
      {(props.data?.length ?? 0) > 1 && (
        <FiltersBar>
          <SelectFilter param="propertyId" label="Property" options={(props.data ?? []).map((p) => ({ value: p.id, label: p.name }))} />
        </FiltersBar>
      )}
      {error && !data ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : loading && !data ? (
        <Skeleton className="h-64" />
      ) : !data?.items.length ? (
        <Card>
          <EmptyState icon={<MessageSquareText />} title="No reviews yet" description="Guests can review after completing their stay." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {data.items.map((r) => (
              <ReviewItem key={r.id} review={r} onReplied={refetch} />
            ))}
          </ul>
          {data.totalPages > 1 && <PaginationBar page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPageChange={(p) => set({ page: p })} />}
        </Card>
      )}
    </>
  );
}

function ReviewItem({ review: r, onReplied }: { review: PartnerReview; onReplied: () => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [reply, setReply] = useState(r.partnerReply ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <span className="inline-flex items-center gap-0.5 text-rating">
              {r.rating} <Star className="size-3.5 fill-current" />
            </span>
            {r.title}
          </p>
          <p className="text-xs text-muted">
            {r.authorName}
            {r.stayMonth ? ` · stayed ${r.stayMonth}` : ""} · {formatDate(r.createdAt)}
            {r.propertyName ? ` · ${r.propertyName}` : ""}
          </p>
        </div>
        {r.status && <StatusBadge kind="review" status={r.status} />}
      </div>
      {r.body && <p className="mt-2 text-sm whitespace-pre-line text-ink-2">{r.body}</p>}
      {r.partnerReply && !editing && (
        <div className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
          <p className="text-xs font-semibold text-muted">Your reply</p>
          <p className="text-ink-2">{r.partnerReply}</p>
        </div>
      )}
      {editing ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (reply.trim().length < 2) return;
            setBusy(true);
            try {
              await api(`/partner/reviews/${r.id}/reply`, { method: "POST", body: { reply: reply.trim() } });
              toast.success("Reply posted");
              setEditing(false);
              onReplied();
            } catch (err) {
              toast.error(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Your reply" hint="Public — shown under the review">
            <Textarea rows={3} maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} autoFocus />
          </Field>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={busy} disabled={reply.trim().length < 2}>
              Post reply
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => setEditing(true)}>
          {r.partnerReply ? "Edit reply" : "Reply"}
        </Button>
      )}
    </li>
  );
}
