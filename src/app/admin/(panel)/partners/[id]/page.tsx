"use client";

import { useParams } from "next/navigation";
import { useApi } from "@/lib/use-api";
import type { PartnerDetail } from "@/lib/types";
import { Badge } from "@/components/ui";
import { LoadState, PageHeader, Tabs } from "@/components/panel/page";
import { StatusBadge } from "@/components/panel/status-badge";
import { useUrlParams } from "@/components/panel/url-state";
import { OverviewTab } from "./overview-tab";
import { PropertiesTab } from "./properties-tab";
import { UsersTab } from "./users-tab";
import { CommissionTab } from "./commission-tab";
import { KycTab } from "./kyc-tab";
import { MoneyTab } from "./money-tab";

type TabKey = "overview" | "properties" | "users" | "commission" | "kyc" | "money";

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { get, set } = useUrlParams();
  const tab = (get("tab") || "overview") as TabKey;
  const { data, error, loading, refetch, mutate } = useApi<PartnerDetail>(`/admin/partners/${id}`);
  const p = data?.id === id ? data : undefined;

  const onUpdated = (next: PartnerDetail) => mutate(() => next);

  return (
    <LoadState loading={loading && !p} error={p ? null : error} onRetry={refetch}>
      {p && (
        <>
          <PageHeader
            title={p.displayName}
            description={`${p.legalName} · ${p.email} · ${p.phone}`}
            breadcrumbs={[{ label: "Partners", href: "/admin/partners" }, { label: p.displayName }]}
            meta={
              <>
                <StatusBadge kind="partner" status={p.status} />
                <StatusBadge kind="kyc" status={p.kycStatus} />
              </>
            }
          />
          <Tabs<TabKey>
            className="mb-5"
            value={tab}
            onChange={(k) => set({ tab: k === "overview" ? null : k })}
            tabs={[
              { key: "overview", label: "Overview" },
              { key: "properties", label: "Properties", badge: <Badge>{p.properties.length}</Badge> },
              { key: "users", label: "Users", badge: <Badge>{p.users.length}</Badge> },
              { key: "commission", label: "Commission", badge: p.commissionRules.length ? <Badge>{p.commissionRules.length}</Badge> : undefined },
              { key: "kyc", label: "KYC & Razorpay" },
              { key: "money", label: "Settlements & ledger" },
            ]}
          />
          <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {tab === "overview" && <OverviewTab partner={p} onUpdated={onUpdated} />}
            {tab === "properties" && <PropertiesTab partner={p} />}
            {tab === "users" && <UsersTab partner={p} onChanged={refetch} />}
            {tab === "commission" && <CommissionTab partner={p} onChanged={refetch} />}
            {tab === "kyc" && <KycTab partner={p} onUpdated={onUpdated} />}
            {tab === "money" && <MoneyTab partner={p} />}
          </div>
        </>
      )}
    </LoadState>
  );
}
