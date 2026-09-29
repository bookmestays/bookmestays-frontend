"use client";

import { cn } from "@/lib/cn";
import { formatDate, formatINR } from "@/lib/format";
import type { Settlement } from "@/lib/types";
import type { Column } from "./data-table";
import { StatusBadge } from "./status-badge";

export function settlementColumns(opts: { showPartner?: boolean } = {}): Column<Settlement>[] {
  return [
    {
      key: "period",
      header: "Period",
      cell: (s) => (
        <span className="whitespace-nowrap">
          {formatDate(s.periodStart, { day: "numeric", month: "short" })} – {formatDate(s.periodEnd)}
        </span>
      ),
      sortValue: (s) => s.periodStart,
    },
    ...(opts.showPartner ? [{ key: "partner", header: "Partner", cell: (s: Settlement) => <span className="font-medium text-ink">{s.partnerName}</span>, sortValue: (s: Settlement) => s.partnerName }] : []),
    { key: "scheduled", header: "Scheduled", cell: (s) => formatDate(s.scheduledFor), sortValue: (s) => s.scheduledFor },
    { key: "count", header: "Bookings", cell: (s) => s.bookingsCount, align: "right", hideBelow: "sm" },
    { key: "gross", header: "Gross", cell: (s) => formatINR(s.grossAmount), align: "right", sortValue: (s) => s.grossAmount, hideBelow: "md" },
    { key: "commission", header: "Commission", cell: (s) => formatINR(s.commissionAmount + s.commissionTax), align: "right", hideBelow: "lg" },
    { key: "net", header: "Net payable", cell: (s) => <span className="font-semibold text-ink">{formatINR(s.netPayable)}</span>, align: "right", sortValue: (s) => s.netPayable },
    { key: "status", header: "Status", cell: (s) => <StatusBadge kind="settlement" status={s.status} />, sortValue: (s) => s.status },
  ];
}

function Line({ label, value, negative, strong, hint }: { label: string; value: number; negative?: boolean; strong?: boolean; hint?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-1.5 text-sm", strong && "mt-1 border-t border-line pt-2.5 text-base font-semibold text-ink")}>
      <dt className={cn(!strong && "text-ink-2")}>
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </dt>
      <dd className={cn("tabular-nums", negative && value !== 0 && "text-danger")}>{negative && value ? `− ${formatINR(Math.abs(value), { decimals: true })}` : formatINR(value, { decimals: true })}</dd>
    </div>
  );
}

/** How net payable is derived — commission shown clearly. */
export function SettlementBreakdown({ s }: { s: Settlement }) {
  return (
    <dl>
      <Line label={`Gross booking value (${s.bookingsCount} booking${s.bookingsCount === 1 ? "" : "s"})`} value={s.grossAmount} hint="Room charges + taxes collected from guests" />
      <Line label="BookMeStays commission" value={s.commissionAmount} negative />
      <Line label="GST on commission" value={s.commissionTax} negative />
      {!!s.tcsAmount && <Line label="TCS" value={s.tcsAmount} negative />}
      {!!s.tdsAmount && <Line label="TDS" value={s.tdsAmount} negative />}
      {!!s.refundAdjustments && <Line label="Refund adjustments" value={s.refundAdjustments} hint="Refunds on already-settled bookings" />}
      {!!s.otherAdjustments && <Line label="Other adjustments" value={s.otherAdjustments} />}
      <Line label="Net payable" value={s.netPayable} strong />
    </dl>
  );
}
