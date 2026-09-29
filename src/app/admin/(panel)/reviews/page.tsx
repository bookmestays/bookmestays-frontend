"use client";

import { useApi } from "@/lib/use-api";
import type { Paginated } from "@/lib/types";
import type { AdminReview } from "@/lib/panel-types";
import { PageHeader } from "@/components/panel/page";
import { DataTable, useUrlPagination } from "@/components/panel/data-table";
import { FiltersBar, SearchFilter, SelectFilter } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";
import { asList } from "@/components/panel/util";
import { reviewColumns } from "../../_components/review-parts";

export default function AdminReviewsPage() {
  const { query } = useUrlParams();
  const { data, error, loading, refetch } = useApi<Paginated<AdminReview> | AdminReview[]>("/admin/reviews", { limit: 20, ...query });
  const pagination = useUrlPagination(data && !Array.isArray(data) ? data : undefined);
  return (
    <>
      <PageHeader title="Reviews" description="Moderate guest reviews before they appear on property pages." />
      <FiltersBar>
        <SearchFilter placeholder="Search text or property…" />
        <SelectFilter
          param="status"
          label="Status"
          options={[
            { value: "PENDING", label: "Pending" },
            { value: "PUBLISHED", label: "Published" },
            { value: "HIDDEN", label: "Hidden" },
          ]}
        />
        <SelectFilter param="rating" label="Rating" options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} star` }))} />
      </FiltersBar>
      <DataTable columns={reviewColumns(refetch)} rows={data ? asList(data) : undefined} rowKey={(r) => r.id} loading={loading} error={error} onRetry={refetch} pagination={pagination} empty={{ title: "No reviews match" }} />
    </>
  );
}
