"use client";

import { useState } from "react";
import { EyeOff, Star } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import type { AdminReview } from "@/lib/panel-types";
import { Button, useToast } from "@/components/ui";
import type { Column } from "@/components/panel/data-table";
import { StatusBadge } from "@/components/panel/status-badge";

export function ReviewModerationActions({ review, onDone }: { review: AdminReview; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const setStatus = async (status: "PUBLISHED" | "HIDDEN") => {
    setBusy(status);
    try {
      await api(`/admin/reviews/${review.id}`, { method: "PATCH", body: { status } });
      toast.success(status === "PUBLISHED" ? "Review published" : "Review hidden");
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex justify-end gap-1">
      {review.status !== "PUBLISHED" && (
        <Button size="sm" onClick={() => setStatus("PUBLISHED")} loading={busy === "PUBLISHED"} disabled={!!busy}>
          Publish
        </Button>
      )}
      {review.status !== "HIDDEN" && (
        <Button size="sm" variant="outline" onClick={() => setStatus("HIDDEN")} loading={busy === "HIDDEN"} disabled={!!busy}>
          <EyeOff className="size-4" /> Hide
        </Button>
      )}
    </div>
  );
}

export function reviewColumns(onDone: () => void): Column<AdminReview>[] {
  return [
    {
      key: "review",
      header: "Review",
      cell: (r: AdminReview) => (
        <div className="max-w-xl">
          <p className="flex items-center gap-1 text-sm font-medium text-ink">
            <span className="inline-flex items-center gap-0.5 text-rating">
              {r.rating} <Star className="size-3.5 fill-current" />
            </span>
            {r.title && <span>· {r.title}</span>}
          </p>
          {r.body && <p className="mt-0.5 line-clamp-3 text-sm text-ink-2">{r.body}</p>}
          <p className="mt-1 text-xs text-muted">
            {r.authorName}
            {r.stayMonth ? ` · stayed ${r.stayMonth}` : ""} · {formatDate(r.createdAt)}
          </p>
          {r.partnerReply && <p className="mt-1 rounded bg-surface-2 px-2 py-1 text-xs text-ink-2">Hotel reply: {r.partnerReply}</p>}
        </div>
      ),
    },
    { key: "property", header: "Property", cell: (r: AdminReview) => r.propertyName ?? "—", hideBelow: "md" as const },
    { key: "status", header: "Status", cell: (r: AdminReview) => <StatusBadge kind="review" status={r.status} /> },
    { key: "act", header: <span className="sr-only">Actions</span>, align: "right" as const, cell: (r: AdminReview) => <ReviewModerationActions review={r} onDone={onDone} /> },
  ];
}

