"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import type { Paginated, PartnerSummary } from "@/lib/types";
import { buttonClass } from "@/components/ui";
import { PageHeader } from "@/components/panel/page";
import { DataTable, useUrlPagination, type Column } from "@/components/panel/data-table";
import { FiltersBar, SearchFilter, SelectFilter } from "@/components/panel/filters";
import { StatusBadge } from "@/components/panel/status-badge";
import { useUrlParams } from "@/components/panel/url-state";
import { SETTLEMENT_CYCLE_LABELS, commissionLabel } from "@/components/panel/labels";

const columns: Column<PartnerSummary>[] = [
  {
    key: "name",
    header: "Partner",
    cell: (p) => (
      <div className="min-w-0">
        <p className="font-medium text-ink">{p.displayName}</p>
        <p className="truncate text-xs text-muted">{p.legalName}</p>
      </div>
    ),
    sortValue: (p) => p.displayName,
  },
  {
    key: "contact",
    header: "Contact",
    cell: (p) => (
      <div className="min-w-0 text-xs">
        <p className="text-ink">{p.contactName}</p>
        <p className="truncate text-muted">{p.email}</p>
      </div>
    ),
    hideBelow: "md",
  },
  { key: "props", header: "Properties", cell: (p) => p.propertyCount, align: "right", sortValue: (p) => p.propertyCount },
  { key: "commission", header: "Commission", cell: (p) => commissionLabel(p.defaultCommissionType, p.defaultCommissionValue), hideBelow: "lg" },
  { key: "cycle", header: "Settlement", cell: (p) => SETTLEMENT_CYCLE_LABELS[p.settlementCycle], hideBelow: "lg" },
  { key: "kyc", header: "KYC", cell: (p) => <StatusBadge kind="kyc" status={p.kycStatus} />, sortValue: (p) => p.kycStatus },
  { key: "status", header: "Status", cell: (p) => <StatusBadge kind="partner" status={p.status} />, sortValue: (p) => p.status },
  { key: "created", header: "Created", cell: (p) => formatDate(p.createdAt), sortValue: (p) => p.createdAt, hideBelow: "md" },
];

export default function PartnersPage() {
  const { query } = useUrlParams();
  const { data, error, loading, refetch } = useApi<Paginated<PartnerSummary>>("/admin/partners", { limit: 20, ...query });
  const pagination = useUrlPagination(data);
  return (
    <>
      <PageHeader
        title="Partners"
        description="Hotel partners and their panel credentials."
        actions={
          <Link href="/admin/partners/new" className={buttonClass()}>
            <Plus className="size-4" /> New partner
          </Link>
        }
      />
      <FiltersBar>
        <SearchFilter placeholder="Search name, email, phone…" />
        <SelectFilter
          param="status"
          label="Status"
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "INACTIVE", label: "Inactive" },
          ]}
        />
        <SelectFilter
          param="kycStatus"
          label="KYC"
          options={[
            { value: "PENDING", label: "Pending" },
            { value: "SUBMITTED", label: "Submitted" },
            { value: "VERIFIED", label: "Verified" },
            { value: "REJECTED", label: "Rejected" },
          ]}
        />
      </FiltersBar>
      <DataTable
        columns={columns}
        rows={data?.items}
        rowKey={(p) => p.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        rowHref={(p) => `/admin/partners/${p.id}`}
        pagination={pagination}
        empty={{
          title: "No partners found",
          description: "Create a partner to give a hotel access to the partner panel.",
          action: (
            <Link href="/admin/partners/new" className={buttonClass("outline", "sm")}>
              <Plus className="size-4" /> New partner
            </Link>
          ),
        }}
      />
    </>
  );
}
