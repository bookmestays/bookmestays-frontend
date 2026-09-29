"use client";

import { useParams } from "next/navigation";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import type { SettlementDetail } from "@/lib/types";
import { KeyValue, LoadState, PageHeader, Section } from "@/components/panel/page";
import { StatusBadge } from "@/components/panel/status-badge";
import { DataTable } from "@/components/panel/data-table";
import { bookingColumns, LedgerTable } from "@/components/panel/booking-parts";
import { SettlementBreakdown } from "@/components/panel/settlement-parts";
import { formatDateTime } from "@/components/panel/labels";
import { RequirePermission } from "../../../_components/require";

export default function PartnerSettlementPage() {
  return (
    <RequirePermission perm="payouts">
      <Detail />
    </RequirePermission>
  );
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, refetch } = useApi<SettlementDetail>(`/partner/settlements/${id}`);
  const s = data?.id === id ? data : undefined;
  return (
    <LoadState loading={loading && !s} error={s ? null : error} onRetry={refetch}>
      {s && (
        <>
          <PageHeader
            title={`Settlement · ${formatDate(s.periodStart, { day: "numeric", month: "short" })} – ${formatDate(s.periodEnd)}`}
            meta={<StatusBadge kind="settlement" status={s.status} />}
            breadcrumbs={[{ label: "Payouts", href: "/partner/payouts" }, { label: formatDate(s.scheduledFor) }]}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            <Section title="How your payout is calculated" className="lg:col-span-2">
              <SettlementBreakdown s={s} />
            </Section>
            <Section title="Payment">
              <KeyValue
                cols={1}
                items={[
                  { label: "Scheduled for", value: formatDate(s.scheduledFor) },
                  { label: "Method", value: s.method ?? "—" },
                  { label: "UTR / reference", value: s.utr ? <span className="font-mono">{s.utr}</span> : "—" },
                  { label: "Paid on", value: formatDateTime(s.paidAt) },
                ]}
              />
            </Section>
          </div>
          <h2 className="mt-6 mb-2 text-base font-semibold text-ink">Bookings ({s.bookings.length})</h2>
          <DataTable columns={bookingColumns()} rows={s.bookings} rowKey={(b) => b.id} rowHref={(b) => `/partner/bookings/${b.id}`} dense empty={{ title: "Adjustments only" }} />
          <h2 className="mt-6 mb-2 text-base font-semibold text-ink">Ledger lines</h2>
          <LedgerTable rows={s.ledger} />
        </>
      )}
    </LoadState>
  );
}
