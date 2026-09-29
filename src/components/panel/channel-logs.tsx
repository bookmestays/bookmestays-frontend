"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, RotateCw } from "lucide-react";
import type { ChannelSyncLog, Paginated } from "@/lib/types";
import { CHANNEL_PROVIDER_LABELS } from "@/lib/types";
import { Badge, Button, Modal, useToast } from "@/components/ui";
import { errorMessage } from "@/lib/use-api";
import { DataTable, type Column, type TablePagination } from "./data-table";
import { StatusBadge } from "./status-badge";
import { formatDateTime } from "./labels";
import { CopyButton } from "./page";

function pretty(payload: string | null) {
  if (!payload) return "";
  const t = payload.trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(t), null, 2);
    } catch {
      return payload;
    }
  }
  if (t.startsWith("<")) {
    // light XML indentation
    let depth = 0;
    return t
      .replace(/>\s*</g, ">\n<")
      .split("\n")
      .map((line) => {
        if (/^<\//.test(line)) depth = Math.max(0, depth - 1);
        const out = "  ".repeat(depth) + line;
        if (/^<[^!?/][^>]*[^/]>$/.test(line) && !/<\/[^>]+>$/.test(line)) depth++;
        return out;
      })
      .join("\n");
  }
  return payload;
}

export function PayloadViewer({ log, onRetry }: { log: ChannelSyncLog; onRetry?: (log: ChannelSyncLog) => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge kind="sync" status={log.status} />
        <Badge>{CHANNEL_PROVIDER_LABELS[log.provider]}</Badge>
        <Badge tone="info">{log.direction === "INBOUND" ? "Inbound" : "Outbound"}</Badge>
        <span className="font-mono text-xs">{log.messageType}</span>
        <span className="text-xs text-muted">
          {formatDateTime(log.createdAt)} · {log.attempts} attempt{log.attempts === 1 ? "" : "s"}
        </span>
      </div>
      {log.error && <p className="rounded-lg bg-danger/5 px-3 py-2 text-sm break-words text-danger">{log.error}</p>}
      {(["requestPayload", "responsePayload"] as const).map((k) => (
        <div key={k}>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{k === "requestPayload" ? "Request" : "Response"}</h3>
            {log[k] && <CopyButton value={log[k] ?? ""} />}
          </div>
          <pre className="max-h-72 overflow-auto rounded-lg bg-ink p-3 font-mono text-xs leading-relaxed whitespace-pre text-white/90">{pretty(log[k]) || "— empty —"}</pre>
        </div>
      ))}
      {onRetry && (log.status === "FAILED" || log.status === "RETRYING") && (
        <div className="flex justify-end">
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onRetry(log);
                toast.success("Retry queued");
              } catch (e) {
                toast.error(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <RotateCw className="size-4" /> Retry now
          </Button>
        </div>
      )}
    </div>
  );
}

export function ChannelLogsTable({
  data,
  loading,
  error,
  onRetry,
  refetch,
  pagination,
  showProvider = true,
}: {
  data: Paginated<ChannelSyncLog> | ChannelSyncLog[] | undefined;
  loading?: boolean;
  error?: { message: string } | null;
  onRetry?: (log: ChannelSyncLog) => Promise<unknown>;
  refetch?: () => void;
  pagination?: TablePagination;
  showProvider?: boolean;
}) {
  const [open, setOpen] = useState<ChannelSyncLog | null>(null);
  const rows = Array.isArray(data) ? data : data?.items;
  const columns: Column<ChannelSyncLog>[] = [
    { key: "time", header: "Time", cell: (l) => <span className="whitespace-nowrap">{formatDateTime(l.createdAt)}</span>, sortValue: (l) => l.createdAt },
    ...(showProvider ? [{ key: "provider", header: "Provider", cell: (l: ChannelSyncLog) => CHANNEL_PROVIDER_LABELS[l.provider] }] : []),
    {
      key: "dir",
      header: "Dir",
      cell: (l) =>
        l.direction === "INBOUND" ? (
          <span className="inline-flex items-center gap-1 text-xs">
            <ArrowDownLeft className="size-3.5 text-sky-600" /> In
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs">
            <ArrowUpRight className="size-3.5 text-brand" /> Out
          </span>
        ),
    },
    { key: "type", header: "Message", cell: (l) => <span className="font-mono text-xs">{l.messageType}</span>, sortValue: (l) => l.messageType },
    { key: "booking", header: "Booking", cell: (l) => l.bookingCode ?? "—", hideBelow: "md" },
    { key: "status", header: "Status", cell: (l) => <StatusBadge kind="sync" status={l.status} />, sortValue: (l) => l.status },
    { key: "attempts", header: "Tries", cell: (l) => l.attempts, align: "right", hideBelow: "sm" },
    { key: "error", header: "Error", cell: (l) => <span className="line-clamp-1 max-w-64 text-xs text-danger">{l.error ?? ""}</span>, hideBelow: "lg" },
  ];
  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(l) => l.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        onRowClick={setOpen}
        pagination={pagination}
        dense
        empty={{ title: "No sync activity yet", description: "Messages exchanged with the channel manager will appear here." }}
      />
      <Modal open={!!open} onClose={() => setOpen(null)} title="Sync message" size="xl">
        {open && (
          <PayloadViewer
            log={open}
            onRetry={
              onRetry
                ? async (l) => {
                    await onRetry(l);
                    setOpen(null);
                    refetch?.();
                  }
                : undefined
            }
          />
        )}
      </Modal>
    </>
  );
}
