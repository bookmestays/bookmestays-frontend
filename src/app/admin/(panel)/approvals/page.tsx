"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { formatDate, formatINR } from "@/lib/format";
import type { AdminPropertyRow, CommissionType, Paginated, PartnerSummary, RoomType } from "@/lib/types";
import type { AdminReview } from "@/lib/panel-types";
import { Button } from "@/components/ui";
import { commissionLabel } from "@/components/panel/labels";
import { PageHeader } from "@/components/panel/page";
import { DataTable, useUrlPagination } from "@/components/panel/data-table";
import { UrlTabs } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";
import { StatusBadge } from "@/components/panel/status-badge";
import { asList } from "@/components/panel/util";
import { propertyColumns } from "../../_components/property-columns";
import { RoomTypeReviewDialog } from "../../_components/room-type-review-dialog";
import { reviewColumns } from "../../_components/review-parts";

export default function ApprovalsPage() {
  const { get } = useUrlParams();
  const tab = get("tab") || "properties";
  return (
    <>
      <PageHeader title="Approvals" description="Everything waiting on an admin decision." />
      <UrlTabs
        tabs={[
          { value: "properties", label: "Properties" },
          { value: "room-types", label: "Room types" },
          { value: "kyc", label: "KYC" },
          { value: "reviews", label: "Guest reviews" },
        ]}
      />
      {tab === "properties" && <PendingProperties />}
      {tab === "room-types" && <PendingRoomTypes />}
      {tab === "kyc" && <PendingKyc />}
      {tab === "reviews" && <PendingReviews />}
    </>
  );
}

function PendingProperties() {
  const { data, error, loading, refetch } = useApi<Paginated<AdminPropertyRow>>("/admin/properties", { status: "PENDING_REVIEW", limit: 50 });
  return (
    <DataTable
      columns={propertyColumns()}
      rows={data?.items}
      rowKey={(p) => p.id}
      loading={loading}
      error={error}
      onRetry={refetch}
      rowHref={(p) => `/admin/properties/${p.id}`}
      empty={{ icon: <BadgeCheck />, title: "No properties awaiting review" }}
    />
  );
}

type PendingRoomTypeRow = RoomType & {
  createdAt: string;
  property: { id: string; name: string; slug: string; status: string };
  partner: { id: string; displayName: string };
  commission: { type: CommissionType; value: number } | null;
};

function PendingRoomTypes() {
  const { get } = useUrlParams();
  const page = Number(get("page")) || 1;
  const { data, error, loading, refetch } = useApi<Paginated<PendingRoomTypeRow>>("/admin/room-types", { status: "PENDING_APPROVAL", page, limit: 25 });
  const [reviewing, setReviewing] = useState<PendingRoomTypeRow | null>(null);
  const pagination = useUrlPagination(data);
  return (
    <>
      <p className="mb-3 text-sm text-muted">New room types added to live properties need approval before guests can book them. Room types on properties under review are approved together with the property.</p>
      <DataTable
        columns={[
          {
            key: "room",
            header: "Room type",
            cell: (r) => (
              <div>
                <p className="font-medium text-ink">{r.name}</p>
                <p className="text-xs text-muted">
                  {r.totalRooms} rooms · max {r.maxOccupancy} guests · {r.ratePlans.length} rate plan{r.ratePlans.length === 1 ? "" : "s"}
                </p>
              </div>
            ),
          },
          {
            key: "property",
            header: "Property",
            cell: (r) => (
              <Link href={`/admin/properties/${r.property.id}?tab=rooms`} className="text-brand hover:underline" onClick={(e) => e.stopPropagation()}>
                {r.property.name}
              </Link>
            ),
          },
          { key: "partner", header: "Partner", cell: (r) => r.partner.displayName, hideBelow: "md" },
          { key: "price", header: "Base price", cell: (r) => formatINR(r.basePrice), align: "right", hideBelow: "sm" },
          { key: "commission", header: "Commission", cell: (r) => (r.commission ? commissionLabel(r.commission.type, r.commission.value) : "—"), hideBelow: "md" },
          { key: "added", header: "Added", cell: (r) => formatDate(r.createdAt), hideBelow: "lg" },
          {
            key: "act",
            header: <span className="sr-only">Actions</span>,
            align: "right",
            cell: (r) => (
              <Button size="sm" onClick={() => setReviewing(r)}>
                Review
              </Button>
            ),
          },
        ]}
        rows={data?.items}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        pagination={pagination}
        empty={{ icon: <BadgeCheck />, title: "No room types awaiting approval" }}
      />
      <RoomTypeReviewDialog
        roomType={reviewing ? { ...reviewing, propertyName: reviewing.property.name } : null}
        onClose={() => setReviewing(null)}
        onDone={refetch}
        partnerDefault={reviewing?.commission ?? null}
      />
    </>
  );
}

function PendingKyc() {
  const { data, error, loading, refetch } = useApi<Paginated<PartnerSummary>>("/admin/partners", { kycStatus: "SUBMITTED", limit: 50 });
  return (
    <DataTable
      columns={[
        { key: "name", header: "Partner", cell: (p) => <span className="font-medium text-ink">{p.displayName}</span> },
        { key: "contact", header: "Contact", cell: (p) => `${p.contactName} · ${p.email}`, hideBelow: "md" },
        { key: "kyc", header: "KYC", cell: (p) => <StatusBadge kind="kyc" status={p.kycStatus} /> },
        { key: "created", header: "Partner since", cell: (p) => formatDate(p.createdAt), hideBelow: "sm" },
      ]}
      rows={data?.items}
      rowKey={(p) => p.id}
      loading={loading}
      error={error}
      onRetry={refetch}
      rowHref={(p) => `/admin/partners/${p.id}?tab=kyc`}
      empty={{ icon: <BadgeCheck />, title: "No KYC submissions to verify" }}
    />
  );
}

function PendingReviews() {
  const { data, error, loading, refetch } = useApi<Paginated<AdminReview> | AdminReview[]>("/admin/reviews", { status: "PENDING", limit: 50 });
  return <DataTable columns={reviewColumns(refetch)} rows={data ? asList(data) : undefined} rowKey={(r) => r.id} loading={loading} error={error} onRetry={refetch} empty={{ icon: <BadgeCheck />, title: "No reviews to moderate" }} />;
}
