"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, CircleSlash } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import { CHANNEL_PROVIDER_LABELS, type ChannelConnection, type ChannelProvider, type ChannelProviderInfo, type ChannelSyncLog, type Paginated } from "@/lib/types";
import { Badge, Button, Card, ErrorState, Skeleton, useToast } from "@/components/ui";
import { CopyButton, PageHeader } from "@/components/panel/page";
import { DataTable, useUrlPagination } from "@/components/panel/data-table";
import { FiltersBar, SelectFilter, UrlTabs } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";
import { StatusBadge } from "@/components/panel/status-badge";
import { ChannelLogsTable } from "@/components/panel/channel-logs";
import { CHANNEL_STATUS, SYNC_STATUS, formatDateTime } from "@/components/panel/labels";

const providerOptions = (Object.keys(CHANNEL_PROVIDER_LABELS) as ChannelProvider[]).map((p) => ({ value: p, label: CHANNEL_PROVIDER_LABELS[p] }));

export default function ChannelManagersPage() {
  const { get } = useUrlParams();
  const tab = get("tab") || "connections";
  return (
    <>
      <PageHeader title="Channel managers" description="AxisRooms, eZee Centrix, STAAH and SiteMinder integrations. One channel manager per property." />
      <UrlTabs
        tabs={[
          { value: "connections", label: "Connections" },
          { value: "logs", label: "Sync logs" },
          { value: "providers", label: "Providers & endpoints" },
        ]}
      />
      {tab === "connections" && <Connections />}
      {tab === "logs" && <Logs />}
      {tab === "providers" && <Providers />}
    </>
  );
}

function Providers() {
  const { data, error, loading, refetch } = useApi<ChannelProviderInfo[]>("/admin/channel/providers");
  if (error && !data) return <ErrorState message={error.message} onRetry={refetch} />;
  if (loading && !data) return <Skeleton className="h-64" />;
  const flag = (ok: boolean, label: string) => (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${ok ? "text-success" : "text-danger"}`}>
      {ok ? <CheckCircle2 className="size-3.5" /> : <CircleSlash className="size-3.5" />} {label} {ok ? "configured" : "missing"}
    </span>
  );
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Share the inbound endpoint and credentials (CM_&lt;PROVIDER&gt;_USERNAME / PASSWORD from the server environment) with the channel manager when onboarding a property.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((p) => (
          <Card key={p.provider} className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink">{p.label}</h3>
              <Badge>{p.provider}</Badge>
            </div>
            <div className="flex flex-wrap gap-3">
              {flag(p.inboundConfigured, "Inbound auth")}
              {flag(p.outboundConfigured, "Outbound endpoint")}
            </div>
            {[
              { label: "OTA XML endpoint", url: p.inboundEndpoint },
              { label: "JSON endpoint", url: p.inboundEndpoint.replace(/\/ota$/, "/json") },
              { label: "Health check", url: p.inboundEndpoint.replace(/\/ota$/, "/health") },
            ].map((e) => (
              <div key={e.label} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted">{e.label}</p>
                  <p className="truncate font-mono text-xs">{e.url}</p>
                </div>
                <CopyButton value={e.url} />
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}

function Connections() {
  const toast = useToast();
  const { query } = useUrlParams();
  const { data, error, loading, refetch, mutate } = useApi<ChannelConnection[] | Paginated<ChannelConnection>>("/admin/channel/connections", { provider: query.provider, status: query.status });
  const rows = Array.isArray(data) ? data : data?.items;
  const [busy, setBusy] = useState<string | null>(null);
  const setStatus = async (c: ChannelConnection, status: "ACTIVE" | "DISABLED") => {
    setBusy(c.id);
    try {
      const next = await api<ChannelConnection>(`/admin/channel/connections/${c.id}`, { method: "PATCH", body: { status } });
      mutate((d) => {
        const list = Array.isArray(d) ? d : (d?.items ?? []);
        return list.map((x) => (x.id === c.id ? { ...x, ...(next && typeof next === "object" ? next : { status }) } : x));
      });
      toast.success(status === "ACTIVE" ? "Connection activated" : "Connection disabled");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <FiltersBar>
        <SelectFilter param="provider" label="Provider" options={providerOptions} />
        <SelectFilter param="status" label="Status" options={Object.entries(CHANNEL_STATUS).map(([value, s]) => ({ value, label: s.label }))} />
      </FiltersBar>
      <DataTable<ChannelConnection>
        rows={rows}
        rowKey={(c) => c.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        columns={[
          {
            key: "property",
            header: "Property",
            cell: (c) => (
              <Link href={`/admin/properties/${c.propertyId}`} className="font-medium text-ink hover:text-brand hover:underline">
                {c.propertyName ?? c.propertyId}
              </Link>
            ),
          },
          { key: "provider", header: "Provider", cell: (c) => CHANNEL_PROVIDER_LABELS[c.provider] },
          { key: "code", header: "CM hotel code", cell: (c) => <span className="font-mono text-xs">{c.cmPropertyCode}</span>, hideBelow: "sm" },
          { key: "maps", header: "Mappings", cell: (c) => c.mappings.length, align: "right", hideBelow: "md" },
          {
            key: "activity",
            header: "Last activity",
            cell: (c) => (
              <div className="text-xs">
                <p>In: {formatDateTime(c.lastInboundAt)}</p>
                <p>Out: {formatDateTime(c.lastOutboundAt)}</p>
                {c.lastError && <p className="line-clamp-1 max-w-56 text-danger">{c.lastError}</p>}
              </div>
            ),
            hideBelow: "lg",
          },
          { key: "status", header: "Status", cell: (c) => <StatusBadge kind="channel" status={c.status} /> },
          {
            key: "act",
            header: <span className="sr-only">Actions</span>,
            align: "right",
            cell: (c) =>
              c.status === "ACTIVE" ? (
                <Button size="sm" variant="outline" loading={busy === c.id} onClick={() => setStatus(c, "DISABLED")}>
                  Disable
                </Button>
              ) : (
                <Button size="sm" loading={busy === c.id} onClick={() => setStatus(c, "ACTIVE")} title={c.mappings.length ? undefined : "No room mappings yet"}>
                  Activate
                </Button>
              ),
          },
        ]}
        empty={{ title: "No connections", description: "Partners connect a channel manager from their property editor." }}
      />
    </>
  );
}

function Logs() {
  const { query } = useUrlParams();
  const { data, error, loading, refetch } = useApi<Paginated<ChannelSyncLog>>("/admin/channel/logs", { limit: 30, ...query, tab: undefined });
  const pagination = useUrlPagination(data);
  return (
    <>
      <FiltersBar>
        <SelectFilter param="status" label="Status" options={Object.entries(SYNC_STATUS).map(([value, s]) => ({ value, label: s.label }))} />
        <SelectFilter param="provider" label="Provider" options={providerOptions} />
      </FiltersBar>
      <ChannelLogsTable data={data} loading={loading} error={error} refetch={refetch} pagination={pagination} onRetry={(l) => api(`/admin/channel/logs/${l.id}/retry`, { method: "POST" })} />
    </>
  );
}
