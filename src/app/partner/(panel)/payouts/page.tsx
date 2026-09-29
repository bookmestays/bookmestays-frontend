"use client";

import { useApi } from "@/lib/use-api";
import { formatINR } from "@/lib/format";
import type { Paginated, PartnerProfile, Settlement } from "@/lib/types";
import type { LedgerPage } from "@/lib/panel-types";
import { KeyValue, PageHeader, Section, StatCard } from "@/components/panel/page";
import { DataTable, useUrlPagination } from "@/components/panel/data-table";
import { DateFilter, FiltersBar, UrlTabs } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";
import { LedgerTable } from "@/components/panel/booking-parts";
import { settlementColumns } from "@/components/panel/settlement-parts";
import { commissionLabel, settlementScheduleLabel } from "@/components/panel/labels";
import { StatusBadge } from "@/components/panel/status-badge";
import { RequirePermission } from "../../_components/require";

export default function PayoutsPage() {
  return (
    <RequirePermission perm="payouts">
      <Payouts />
    </RequirePermission>
  );
}

function Payouts() {
  const { get } = useUrlParams();
  const tab = get("tab") || "settlements";
  const me = useApi<PartnerProfile>("/partner/me");
  const p = me.data;
  return (
    <>
      <PageHeader title="Payouts" description="Settlements of completed stays to your bank account, after BookMeStays commission and taxes." />
      {p && (
        <Section className="mb-4">
          <KeyValue
            cols={3}
            items={[
              { label: "Commission", value: `${commissionLabel(p.defaultCommissionType, p.defaultCommissionValue)} + GST${p.commissionRules.length ? ` (${p.commissionRules.length} room/property-specific rate${p.commissionRules.length === 1 ? "" : "s"})` : ""}` },
              { label: "Settlement schedule", value: settlementScheduleLabel(p) },
              { label: "Paid to", value: p.bankAccountLast4 ? <span>•••• {p.bankAccountLast4} <StatusBadge kind="kyc" status={p.kycStatus} /></span> : "Add bank details in your profile" },
            ]}
          />
        </Section>
      )}
      <UrlTabs
        tabs={[
          { value: "settlements", label: "Settlements" },
          { value: "ledger", label: "Ledger" },
        ]}
      />
      {tab === "settlements" ? <SettlementList /> : <Ledger />}
    </>
  );
}

function SettlementList() {
  const { page } = useUrlParams();
  const { data, error, loading, refetch } = useApi<Paginated<Settlement>>("/partner/settlements", { page, limit: 20 });
  const pagination = useUrlPagination(data);
  return (
    <DataTable
      columns={settlementColumns()}
      rows={data?.items}
      rowKey={(s) => s.id}
      loading={loading}
      error={error}
      onRetry={refetch}
      rowHref={(s) => `/partner/payouts/${s.id}`}
      pagination={pagination}
      empty={{ title: "No settlements yet", description: "Completed stays are settled on your settlement day." }}
    />
  );
}

function Ledger() {
  const { query } = useUrlParams();
  const { data, error, loading, refetch } = useApi<LedgerPage>("/partner/ledger", { limit: 30, ...query, tab: undefined });
  const pagination = useUrlPagination(data);
  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Current balance" value={data ? formatINR(data.balance, { decimals: true }) : "—"} hint="Owed to you, not yet settled" tone="brand" />
      </div>
      <FiltersBar>
        <DateFilter label="Date" />
      </FiltersBar>
      <LedgerTable rows={data?.items} loading={loading} error={error} onRetry={refetch} pagination={pagination} />
    </>
  );
}
