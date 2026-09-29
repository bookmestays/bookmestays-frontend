"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { PROPERTY_TYPE_LABELS, type AdminPropertyRow, type Paginated, type PartnerSummary, type PropertyType } from "@/lib/types";
import { Button } from "@/components/ui";
import { PageHeader } from "@/components/panel/page";
import { DataTable, useUrlPagination } from "@/components/panel/data-table";
import { FiltersBar, SearchFilter, SelectFilter } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";
import { PROPERTY_STATUS } from "@/components/panel/labels";
import { useSiteMeta } from "@/components/panel/util";
import { propertyColumns } from "../../_components/property-columns";
import { NewPropertyDialog } from "../../_components/new-property-dialog";

export default function AdminPropertiesPage() {
  const { query } = useUrlParams();
  const [creating, setCreating] = useState(false);
  const meta = useSiteMeta();
  const partners = useApi<Paginated<PartnerSummary>>("/admin/partners", { limit: 100 });
  const { data, error, loading, refetch } = useApi<Paginated<AdminPropertyRow>>("/admin/properties", { limit: 20, ...query });
  const pagination = useUrlPagination(data);
  return (
    <>
      <PageHeader
        title="Properties"
        description="All properties across partners — review, edit content and curate."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New property
          </Button>
        }
      />
      <FiltersBar>
        <SearchFilter placeholder="Search name or slug…" />
        <SelectFilter param="status" label="Status" options={Object.entries(PROPERTY_STATUS).map(([value, s]) => ({ value, label: s.label }))} />
        <SelectFilter param="type" label="Type" options={(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => ({ value: t, label: PROPERTY_TYPE_LABELS[t] }))} />
        <SelectFilter param="cityId" label="City" options={(meta.data?.cities ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        <SelectFilter param="partnerId" label="Partner" options={(partners.data?.items ?? []).map((p) => ({ value: p.id, label: p.displayName }))} />
      </FiltersBar>
      <DataTable
        columns={propertyColumns()}
        rows={data?.items}
        rowKey={(p) => p.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        rowHref={(p) => `/admin/properties/${p.id}`}
        pagination={pagination}
        empty={{ title: "No properties match", description: "Try clearing filters." }}
      />
      <NewPropertyDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
