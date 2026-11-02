"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, CheckCircle2, Clock, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import { formatINR } from "@/lib/format";
import type { Paginated, PartnerProfile, PayoutStatus, Settlement } from "@/lib/types";
import type { LedgerPage } from "@/lib/panel-types";
import { Button, useToast } from "@/components/ui";
import { Alert, KeyValue, PageHeader, Section, StatCard } from "@/components/panel/page";
import { DataTable, useUrlPagination } from "@/components/panel/data-table";
import { DateFilter, FiltersBar, UrlTabs } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";
import { LedgerTable } from "@/components/panel/booking-parts";
import { settlementColumns } from "@/components/panel/settlement-parts";
import { commissionLabel, settlementScheduleLabel } from "@/components/panel/labels";
import { StatusBadge } from "@/components/panel/status-badge";
import { usePanelAuth } from "@/components/panel/auth";
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
      {p && <PayoutSetup profile={p} onChanged={me.refetch} />}
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

const PAYOUT_STEPS = ["Add bank & tax details", "KYC verified by BookMeStays", "Set up & activate payouts"] as const;

/** How far along the 3-step onboarding each status is (0 = none done, 3 = all done). */
function stepsDone(status: PayoutStatus): number {
  switch (status) {
    case "DETAILS_INCOMPLETE":
      return 0;
    case "KYC_PENDING":
    case "KYC_REJECTED":
      return 1;
    case "READY_TO_SETUP":
    case "PENDING_ACTIVATION":
      return 2;
    case "ACTIVE":
      return 3;
  }
}

function PayoutSetup({ profile: p, onChanged }: { profile: PartnerProfile; onChanged: () => void }) {
  const toast = useToast();
  const { isOwner } = usePanelAuth();
  const [busy, setBusy] = useState(false);
  const status = p.payoutStatus;

  if (status === "ACTIVE")
    return (
      <Alert tone="success" title="Payouts are active" className="mb-4">
        Settlements for completed stays are released to •••• {p.bankAccountLast4} on your settlement schedule.
      </Alert>
    );

  const setUp = async () => {
    setBusy(true);
    try {
      await api("/partner/me/linked-account", { method: "POST" });
      toast.success("Payout account created — BookMeStays will activate it shortly");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Could not set up payouts"));
    } finally {
      setBusy(false);
    }
  };

  const done = stepsDone(status);

  return (
    <Section title="Set up payouts" description="Complete these steps to start receiving settlements." className="mb-4" actions={<Wallet className="size-4 text-muted" />}>
      <ol className="mb-4 space-y-2">
        {PAYOUT_STEPS.map((label, i) => {
          const state = i < done ? "done" : i === done ? "current" : "pending";
          return (
            <li key={label} className="flex items-center gap-2 text-sm">
              {state === "done" ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" />
              ) : state === "current" ? (
                <Clock className="size-4 shrink-0 text-brand" />
              ) : (
                <span className="size-4 shrink-0 rounded-full border border-line" />
              )}
              <span className={state === "pending" ? "text-muted" : "text-ink"}>{label}</span>
            </li>
          );
        })}
      </ol>

      {status === "DETAILS_INCOMPLETE" && (
        <Alert tone="info">
          Add your PAN and bank account in your{" "}
          <Link href="/partner/profile" className="font-medium text-brand hover:underline">
            business profile
          </Link>{" "}
          to begin.
        </Alert>
      )}
      {status === "KYC_PENDING" && <Alert tone="info">Your details are being verified by BookMeStays. You can set up payouts once KYC is verified.</Alert>}
      {status === "KYC_REJECTED" && (
        <Alert tone="danger" title="KYC needs attention">
          Please correct the flagged details in your{" "}
          <Link href="/partner/profile" className="font-medium underline">
            business profile
          </Link>{" "}
          and resubmit.
        </Alert>
      )}
      {status === "READY_TO_SETUP" &&
        (isOwner ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-2">Your KYC is verified. Create your Razorpay payout account now — BookMeStays activates it before your first settlement.</p>
            <Button loading={busy} onClick={setUp}>
              <BadgeCheck className="size-4" /> Set up payouts
            </Button>
          </div>
        ) : (
          <Alert>Only the account owner can set up payouts.</Alert>
        ))}
      {status === "PENDING_ACTIVATION" && (
        <Alert tone="info" title="Almost there">
          Your payout account has been created and is awaiting activation by BookMeStays. You&apos;ll start receiving settlements once it&apos;s active.
        </Alert>
      )}
    </Section>
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
