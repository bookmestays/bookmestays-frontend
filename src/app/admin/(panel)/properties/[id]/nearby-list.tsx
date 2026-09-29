"use client";

import type { PartnerPropertyDetail } from "@/lib/types";
import { Card, EmptyState } from "@/components/ui";

export function NearbyList({ property }: { property: PartnerPropertyDetail }) {
  if (!property.nearby.length) return <EmptyState title="No nearby places" description="Partners add nearby attractions from their panel." />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {property.nearby.map((n) => (
        <Card key={n.id} className="p-4">
          <p className="font-medium text-ink">{n.name}</p>
          <p className="text-xs text-muted">
            {n.category}
            {n.distanceKm != null && ` · ${n.distanceKm} km`}
            {n.media.length ? ` · ${n.media.length} media` : ""}
          </p>
          {n.description && <p className="mt-2 line-clamp-3 text-sm text-ink-2">{n.description}</p>}
        </Card>
      ))}
    </div>
  );
}
