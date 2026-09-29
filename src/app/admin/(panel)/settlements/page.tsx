"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import type { Paginated, PartnerSummary, Settlement } from "@/lib/types";
import { Button, useToast } from "@/components/ui";
import { PageHeader } from "@/components/panel/page";
import { DataTable, useUrlPagination } from "@/components/panel/data-table";
import { FiltersBar, SelectFilter } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";
import { SETTLEMENT_STATUS } from "@/components/panel/labels";
import { settlementColumns } from "@/components/panel/settlement-parts";

export default function AdminSettlementsPage() {
  const toast = useToast();
  const { query } = useUrlParams();
  const partners = useApi<Paginated<PartnerSummary>>("/admin/partners", { limit: 100 });
  const { data, error, loading, refetch } = useApi<Paginated<Settlement>>("/admin/settlements", { limit: 20, ...query });
  const pagination = useUrlPagination(data);
  const [running, setRunning] = useState(false);
  return (
    <>
      <PageHeader
        title="Settlements"
        description="Partner payouts: completed stays past their settlement date, minus commission and taxes."
        actions={
          <Button
            loading={running}
            onClick={async () => {
              setRunning(true);
              try {
                const res = await api<{ created: number }>("/admin/settlements/run", { method: "POST" });
                toast.success(res.created ? `${res.created} settlement${res.created === 1 ? "" : "s"} generated` : "Nothing due right now");
                refetch();
              } catch (e) {
                toast.error(errorMessage(e));
              } finally {
                setRunning(false);
              }
            }}
          >
            <Play className="size-4" /> Run settlements now
          </Button>
        }
      />
      <FiltersBar>
        <SelectFilter param="status" label="Status" options={Object.entries(SETTLEMENT_STATUS).map(([value, s]) => ({ value, label: s.label }))} />
        <SelectFilter param="partnerId" label="Partner" options={(partners.data?.items ?? []).map((p) => ({ value: p.id, label: p.displayName }))} />
      </FiltersBar>
      <DataTable
        columns={settlementColumns({ showPartner: true })}
        rows={data?.items}
        rowKey={(s) => s.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        rowHref={(s) => `/admin/settlements/${s.id}`}
        pagination={pagination}
        empty={{ title: "No settlements", description: "Settlements are generated daily at 06:00 IST, or run them now." }}
      />
    </>
  );
}
