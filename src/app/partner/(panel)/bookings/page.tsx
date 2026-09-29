"use client";

import { useState } from "react";
import { useApi } from "@/lib/use-api";
import type { BookingSummary, Paginated, PartnerPropertyRow } from "@/lib/types";
import { PageHeader } from "@/components/panel/page";
import { DataTable, useUrlPagination } from "@/components/panel/data-table";
import { DateFilter, FiltersBar, SearchFilter, SelectFilter, UrlTabs } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";
import { bookingColumns } from "@/components/panel/booking-parts";
import { todayISO } from "@/components/panel/util";
import { RequirePermission } from "../../_components/require";

const TABS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "in-house", label: "In-house" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
];

export default function PartnerBookingsPage() {
  return (
    <RequirePermission perm="bookings">
      <Bookings />
    </RequirePermission>
  );
}

function Bookings() {
  const { get, query } = useUrlParams();
  const [today] = useState(todayISO);
  const tab = get("tab") || "upcoming";
  const tabQuery: Record<string, string | undefined> =
    tab === "in-house" ? { status: "CHECKED_IN" } : tab === "past" ? { status: get("status") || "COMPLETED" } : tab === "cancelled" ? { status: "CANCELLED" } : { status: "CONFIRMED", from: get("from") || today };
  const props = useApi<PartnerPropertyRow[]>("/partner/properties");
  const { data, error, loading, refetch } = useApi<Paginated<BookingSummary>>("/partner/bookings", { limit: 20, ...query, ...tabQuery, tab });
  const pagination = useUrlPagination(data);
  return (
    <>
      <PageHeader title="Bookings" description="Guest bookings for your properties. All bookings are prepaid." />
      <UrlTabs tabs={TABS} />
      <FiltersBar>
        <SearchFilter placeholder="Code or guest name…" />
        {(props.data?.length ?? 0) > 1 && <SelectFilter param="propertyId" label="Property" options={(props.data ?? []).map((p) => ({ value: p.id, label: p.name }))} />}
        {tab === "past" && (
          <SelectFilter
            param="status"
            label="Outcome"
            allLabel="Completed"
            options={[{ value: "NO_SHOW", label: "No-show" }]}
          />
        )}
        {tab !== "in-house" && <DateFilter label="Check-in" />}
      </FiltersBar>
      <DataTable
        columns={bookingColumns({ showProperty: (props.data?.length ?? 0) > 1 })}
        rows={data?.items}
        rowKey={(b) => b.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        rowHref={(b) => `/partner/bookings/${b.id}`}
        pagination={pagination}
        empty={{ title: tab === "upcoming" ? "No upcoming bookings" : tab === "in-house" ? "No guests in-house" : "No bookings here" }}
      />
    </>
  );
}
