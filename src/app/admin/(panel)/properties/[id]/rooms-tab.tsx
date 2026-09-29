"use client";

import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { useApi } from "@/lib/use-api";
import type { PartnerDetail, PartnerPropertyDetail, RoomType } from "@/lib/types";
import { Badge, Button } from "@/components/ui";
import { commissionLabel } from "@/components/panel/labels";
import { RoomsTab as RoomsEditor } from "../../../../partner/(panel)/properties/[id]/rooms-tab";
import { RoomTypeReviewDialog } from "../../../_components/room-type-review-dialog";

/**
 * Admin view of a property's room types and rate plans. Uses the same editor as the partner panel
 * (create / edit / delete via /admin/*), plus approval of pending room types and commission badges.
 */
export function RoomsTab({ property, onChanged }: { property: PartnerPropertyDetail; onChanged: () => void }) {
  const [reviewing, setReviewing] = useState<RoomType | null>(null);
  const partner = useApi<PartnerDetail>(`/admin/partners/${property.partnerId}`);
  const rules = partner.data?.commissionRules ?? [];

  return (
    <>
      <RoomsEditor
        property={property}
        onChanged={onChanged}
        apiBase="/admin"
        roomBadges={(rt) => {
          const rule = rules.find((r) => r.roomTypeId === rt.id);
          return rule ? <Badge tone="brand">Commission {commissionLabel(rule.type, rule.value)}</Badge> : null;
        }}
        roomActions={(rt) =>
          rt.status === "PENDING_APPROVAL" ? (
            <Button size="sm" onClick={() => setReviewing(rt)}>
              <BadgeCheck className="size-4" /> Review
            </Button>
          ) : null
        }
      />
      <RoomTypeReviewDialog
        roomType={reviewing ? { ...reviewing, propertyName: property.name } : null}
        onClose={() => setReviewing(null)}
        onDone={() => {
          partner.refetch();
          onChanged();
        }}
        partnerDefault={partner.data ? { type: partner.data.defaultCommissionType, value: partner.data.defaultCommissionValue } : null}
      />
    </>
  );
}
