"use client";

import { Cable, Star, ThumbsUp } from "lucide-react";
import { PropertyThumb } from "@/components/panel/property-thumb";
import { formatDate, formatINR } from "@/lib/format";
import { PROPERTY_TYPE_LABELS, type AdminPropertyRow } from "@/lib/types";
import { Badge } from "@/components/ui";
import type { Column } from "@/components/panel/data-table";
import { StatusBadge } from "@/components/panel/status-badge";

export function propertyColumns({ showPartner = true }: { showPartner?: boolean } = {}): Column<AdminPropertyRow>[] {
  return [
    {
      key: "name",
      header: "Property",
      cell: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          <PropertyThumb url={p.coverImageUrl} name={p.name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{p.name}</p>
            <p className="flex flex-wrap items-center gap-1 text-xs text-muted">
              {PROPERTY_TYPE_LABELS[p.type]} · {p.cityName ?? "No city"}
              {p.isFeatured && (
                <Badge tone="brand" className="px-1.5 py-0">
                  <Star className="size-3" /> Featured
                </Badge>
              )}
              {p.isRecommended && (
                <Badge tone="info" className="px-1.5 py-0">
                  <ThumbsUp className="size-3" /> Recommended
                </Badge>
              )}
            </p>
          </div>
        </div>
      ),
      sortValue: (p) => p.name,
    },
    ...(showPartner ? [{ key: "partner", header: "Partner", cell: (p: AdminPropertyRow) => p.partnerName, sortValue: (p: AdminPropertyRow) => p.partnerName, hideBelow: "md" as const }] : []),
    {
      key: "rooms",
      header: "Room types",
      cell: (p) => (
        <span className="whitespace-nowrap">
          {p.roomTypeCount}
          {p.pendingRoomTypes > 0 && (
            <Badge tone="warning" className="ml-1.5">
              {p.pendingRoomTypes} pending
            </Badge>
          )}
        </span>
      ),
      hideBelow: "sm",
    },
    { key: "price", header: "From", cell: (p) => formatINR(p.startingPrice), align: "right", sortValue: (p) => p.startingPrice, hideBelow: "lg" },
    {
      key: "bookings",
      header: "Bookings",
      align: "right",
      hideBelow: "lg",
      sortValue: (p) => p.popularityScore,
      cell: (p) => (
        <span className="whitespace-nowrap tabular-nums" title={`Ranking score ${p.popularityScore} = ${p.completedBookings} completed − 0.5 × ${p.cancelledBookings} cancelled`}>
          <span className="font-medium text-ink">{p.completedBookings}</span>
          <span className="text-muted"> done</span>
          {p.cancelledBookings > 0 && <span className="text-muted"> · {p.cancelledBookings} canc.</span>}
        </span>
      ),
    },
    {
      key: "cm",
      header: "CM",
      cell: (p) =>
        p.channelManaged ? (
          <span title="Rates & availability managed by a channel manager" className="text-sky-600">
            <Cable className="size-4" />
            <span className="sr-only">Channel managed</span>
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
      align: "center",
      hideBelow: "lg",
    },
    { key: "status", header: "Status", cell: (p) => <StatusBadge kind="property" status={p.status} />, sortValue: (p) => p.status },
    { key: "updated", header: "Updated", cell: (p) => formatDate(p.updatedAt), sortValue: (p) => p.updatedAt, hideBelow: "md" },
  ];
}
