"use client";

import Link from "next/link";
import { useApi } from "@/lib/use-api";
import { formatDate, formatINR } from "@/lib/format";
import type { AdminReport, ReportMetrics } from "@/lib/types";
import { PageHeader, Section, StatCard } from "@/components/panel/page";
import { DataTable, type Column } from "@/components/panel/data-table";
import { FiltersBar, DateFilter, SelectFilter } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";

/** "2026-11" → "Nov 2026"; "2026-11-02" (week start) → "Wk of 2 Nov". */
function periodLabel(period: string, groupBy: "week" | "month") {
  if (groupBy === "month") return formatDate(`${period}-01`, { month: "short", year: "numeric" });
  return `Wk of ${formatDate(period, { day: "numeric", month: "short" })}`;
}

const money = (v: number) => formatINR(v);

export default function AdminReportsPage() {
  const { query } = useUrlParams();
  const { data, error, loading, refetch } = useApi<AdminReport>("/admin/reports", query);
  const groupBy = (data?.range.groupBy ?? "month") as "week" | "month";

  const metricCols: Column<ReportMetrics & { period?: string }>[] = [
    { key: "bookings", header: "Bookings", cell: (r) => r.bookings, align: "right" },
    { key: "gmv", header: "Gross value", cell: (r) => money(r.gmv), align: "right" },
    { key: "commission", header: "Our commission", cell: (r) => money(r.commissionTotal), align: "right" },
    { key: "payout", header: "Hotel payout", cell: (r) => money(r.hotelPayout), align: "right" },
  ];

  return (
    <>
      <PageHeader
        title="Reports"
        description={
          data
            ? `Confirmed bookings from ${formatDate(data.range.from)} to ${formatDate(data.range.to)}, grouped by ${data.range.groupBy}.`
            : "Revenue, commission and hotel payouts by week or month."
        }
      />
      <FiltersBar>
        <DateFilter label="Date range" />
        <SelectFilter
          param="groupBy"
          label="Group by"
          options={[
            { value: "month", label: "Month" },
            { value: "week", label: "Week" },
          ]}
        />
      </FiltersBar>

      {data && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Bookings" value={data.summary.bookings} hint="Confirmed in range" />
            <StatCard label="Gross booking value" value={money(data.summary.gmv)} hint="Total guests paid" tone="brand" />
            <StatCard label="Our commission" value={money(data.summary.commissionTotal)} hint="Incl. GST — our earning" tone="brand" />
            <StatCard label="Payable to hotels" value={money(data.summary.hotelPayout)} hint="For bookings in range" />
          </div>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <StatCard label="Paid to hotels" value={money(data.payouts.paidToHotels)} hint="Settled by bank transfer in range" />
            <StatCard label="Outstanding to hotels" value={money(data.payouts.outstandingToHotels)} hint="Not yet paid (all time)" tone="warning" />
            <StatCard label="Taxes (TCS + TDS)" value={money(data.summary.taxesCollected)} hint="For bookings in range" />
          </div>
        </>
      )}

      <Section title={`By ${groupBy}`} className="mb-4" bodyClassName="p-0 sm:p-0">
        <DataTable
          className="rounded-none border-0"
          columns={[
            {
              key: "period",
              header: groupBy === "month" ? "Month" : "Week",
              cell: (r) => <span className="font-medium text-ink">{periodLabel(r.period!, groupBy)}</span>,
            },
            ...metricCols,
          ]}
          rows={data?.buckets}
          rowKey={(r) => r.period!}
          loading={loading}
          error={error}
          onRetry={refetch}
          dense
          empty={{ title: "No bookings in this range" }}
        />
      </Section>

      <Section title="By hotel" bodyClassName="p-0 sm:p-0">
        <DataTable
          className="rounded-none border-0"
          columns={[
            {
              key: "partner",
              header: "Hotel / partner",
              cell: (r) => (
                <Link href={`/admin/partners/${r.partnerId}`} className="font-medium text-brand hover:underline">
                  {r.partnerName}
                </Link>
              ),
            },
            ...metricCols,
          ]}
          rows={data?.perPartner}
          rowKey={(r) => r.partnerId}
          loading={loading}
          error={error}
          onRetry={refetch}
          dense
          empty={{ title: "No bookings in this range" }}
        />
      </Section>
    </>
  );
}
