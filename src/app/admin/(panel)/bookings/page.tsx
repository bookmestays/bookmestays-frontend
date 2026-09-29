"use client";

import { useApi } from "@/lib/use-api";
import type { BookingSummary, Paginated, PartnerSummary } from "@/lib/types";
import { PageHeader } from "@/components/panel/page";
import { DataTable, useUrlPagination } from "@/components/panel/data-table";
import { DateFilter, FiltersBar, SearchFilter, SelectFilter } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";
import { BOOKING_STATUS } from "@/components/panel/labels";
import { bookingColumns } from "@/components/panel/booking-parts";

export default function AdminBookingsPage() {
  const { query } = useUrlParams();
  const partners = useApi<Paginated<PartnerSummary>>("/admin/partners", { limit: 100 });
  const { data, error, loading, refetch } = useApi<Paginated<BookingSummary>>("/admin/bookings", { limit: 20, ...query });
  const pagination = useUrlPagination(data);
  return (
    <>
      <PageHeader title="Bookings" description="All guest bookings across the platform." />
      <FiltersBar>
        <SearchFilter placeholder="Code, guest name, email…" />
        <SelectFilter param="status" label="Status" options={Object.entries(BOOKING_STATUS).map(([value, s]) => ({ value, label: s.label }))} />
        <SelectFilter param="partnerId" label="Partner" options={(partners.data?.items ?? []).map((p) => ({ value: p.id, label: p.displayName }))} />
        <DateFilter label="Check-in" />
      </FiltersBar>
      <DataTable
        columns={bookingColumns()}
        rows={data?.items}
        rowKey={(b) => b.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        rowHref={(b) => `/admin/bookings/${b.id}`}
        pagination={pagination}
        empty={{ title: "No bookings match", description: "Try clearing filters." }}
      />
    </>
  );
}
