"use client";

import { useState } from "react";
import { useApi } from "@/lib/use-api";
import type { Paginated } from "@/lib/types";
import type { AuditLog } from "@/lib/panel-types";
import { Badge, Modal } from "@/components/ui";
import { KeyValue, PageHeader } from "@/components/panel/page";
import { DataTable, useUrlPagination } from "@/components/panel/data-table";
import { FiltersBar, SearchFilter, SelectFilter } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";
import { formatDateTime } from "@/components/panel/labels";

const ENTITIES = ["partner", "property", "room_type", "commission_rule", "booking", "settlement", "banner", "city", "experience", "collection", "coupon", "user", "settings", "review"];

export default function AuditLogsPage() {
  const { query } = useUrlParams();
  const { data, error, loading, refetch } = useApi<Paginated<AuditLog>>("/admin/audit-logs", { limit: 30, ...query });
  const pagination = useUrlPagination(data);
  const [open, setOpen] = useState<AuditLog | null>(null);
  return (
    <>
      <PageHeader title="Audit logs" description="Who changed what, and when." />
      <FiltersBar>
        <SelectFilter param="entity" label="Entity" options={ENTITIES.map((e) => ({ value: e, label: e.replace(/_/g, " ") }))} />
        <SearchFilter param="entityId" placeholder="Entity ID…" />
      </FiltersBar>
      <DataTable<AuditLog>
        rows={data?.items}
        rowKey={(l) => l.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        pagination={pagination}
        onRowClick={setOpen}
        dense
        columns={[
          { key: "time", header: "Time", cell: (l) => <span className="whitespace-nowrap">{formatDateTime(l.createdAt)}</span> },
          { key: "actor", header: "Actor", cell: (l) => <span>{l.actorName ?? l.actorEmail ?? (l.actorUserId ? l.actorUserId.slice(0, 8) : "System")}{l.actorRole && <span className="ml-1 text-xs text-muted">{l.actorRole}</span>}</span> },
          { key: "action", header: "Action", cell: (l) => <Badge>{l.action}</Badge> },
          { key: "entity", header: "Entity", cell: (l) => <span className="text-xs">{l.entity} <span className="font-mono text-muted">{l.entityId?.slice(0, 8)}</span></span>, hideBelow: "md" },
          { key: "ip", header: "IP", cell: (l) => <span className="font-mono text-xs">{l.ip ?? "—"}</span>, hideBelow: "lg" },
        ]}
        empty={{ title: "No audit entries" }}
      />
      <Modal open={!!open} onClose={() => setOpen(null)} title="Audit entry" size="lg">
        {open && (
          <div className="space-y-4">
            <KeyValue
              items={[
                { label: "Action", value: open.action },
                { label: "When", value: formatDateTime(open.createdAt) },
                { label: "Actor", value: `${open.actorName ?? open.actorEmail ?? open.actorUserId ?? "System"} (${open.actorRole ?? "—"})` },
                { label: "Entity", value: `${open.entity} ${open.entityId ?? ""}` },
                { label: "IP", value: open.ip },
              ]}
            />
            <pre className="max-h-96 overflow-auto rounded-lg bg-ink p-3 font-mono text-xs text-white/90">{JSON.stringify(open.data, null, 2) ?? "—"}</pre>
          </div>
        )}
      </Modal>
    </>
  );
}
