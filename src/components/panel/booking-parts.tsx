"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatDate, formatINR } from "@/lib/format";
import type { BookingDetail, BookingSummary, LedgerEntry } from "@/lib/types";
import { PolicySummary } from "./cancellation-policy-editor";
import { DataTable, type Column, type TablePagination } from "./data-table";
import { KeyValue, Section } from "./page";
import { StatusBadge } from "./status-badge";
import { formatDateTime, humanize } from "./labels";

export const stayLabel = (b: Pick<BookingSummary, "checkIn" | "checkOut" | "nights">) =>
  `${formatDate(b.checkIn, { day: "numeric", month: "short" })} – ${formatDate(b.checkOut, { day: "numeric", month: "short", year: "numeric" })} · ${b.nights}N`;

export const guestsLabel = (b: Pick<BookingSummary, "adults" | "children">) =>
  `${b.adults} adult${b.adults === 1 ? "" : "s"}${b.children ? `, ${b.children} child${b.children === 1 ? "" : "ren"}` : ""}`;

export function bookingColumns(opts: { showProperty?: boolean; hrefBase?: string } = {}): Column<BookingSummary>[] {
  return [
    {
      key: "code",
      header: "Booking",
      cell: (b) => (
        <div>
          <p className="font-mono text-xs font-semibold text-ink">{b.code}</p>
          <p className="text-xs text-muted">{formatDate(b.createdAt)}</p>
        </div>
      ),
      sortValue: (b) => b.createdAt,
    },
    { key: "guest", header: "Guest", cell: (b) => <span className="font-medium text-ink">{b.guestName}</span>, sortValue: (b) => b.guestName },
    ...(opts.showProperty !== false
      ? [
          {
            key: "property",
            header: "Property",
            cell: (b: BookingSummary) => (
              <div className="min-w-0">
                <p className="truncate text-ink">{b.property.name}</p>
                <p className="text-xs text-muted">{b.property.cityName}</p>
              </div>
            ),
            hideBelow: "md" as const,
          },
        ]
      : []),
    {
      key: "stay",
      header: "Stay",
      cell: (b) => (
        <div>
          <p className="whitespace-nowrap">{stayLabel(b)}</p>
          <p className="text-xs text-muted">{b.roomsLabel}</p>
        </div>
      ),
      sortValue: (b) => b.checkIn,
    },
    { key: "amount", header: "Amount", cell: (b) => formatINR(b.totalAmount), align: "right", sortValue: (b) => b.totalAmount },
    { key: "status", header: "Status", cell: (b) => <StatusBadge kind="booking" status={b.status} />, sortValue: (b) => b.status },
  ];
}

function Row({ label, value, strong, negative, hint }: { label: ReactNode; value: number | null | undefined; strong?: boolean; negative?: boolean; hint?: ReactNode }) {
  if (value == null) return null;
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-1.5 text-sm", strong && "border-t border-line pt-2.5 font-semibold text-ink")}>
      <dt className={cn(!strong && "text-ink-2")}>
        {label}
        {hint && <span className="block text-xs font-normal text-muted">{hint}</span>}
      </dt>
      <dd className="tabular-nums">{negative && value ? `− ${formatINR(value, { decimals: true })}` : formatINR(value, { decimals: true })}</dd>
    </div>
  );
}

/** Guest charges + (for partner/admin) commission and payout breakdown. */
export function PriceBreakdown({ b, showPayout = true }: { b: BookingDetail; showPayout?: boolean }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">Guest paid</h3>
        <dl>
          <Row label="Room charges" value={b.roomAmount} />
          <Row label="Taxes (GST)" value={b.roomTax} />
          {!!b.addonsAmount && <Row label="Add-ons" value={b.addonsAmount} />}
          {!!b.discountAmount && <Row label="Discount" value={b.discountAmount} negative />}
          <Row label="Total" value={b.totalAmount} strong />
          {!!b.refundAmount && <Row label="Refunded" value={b.refundAmount} negative />}
        </dl>
      </div>
      {showPayout && b.partnerPayout !== undefined && (
        <div>
          <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">Hotel payout</h3>
          <dl>
            <Row label="Room charges + tax" value={b.roomAmount + b.roomTax} />
            <Row label="BookMeStays commission" value={b.commissionAmount} negative />
            <Row label="GST on commission" value={b.commissionTax} negative />
            {!!b.tcsAmount && <Row label="TCS" value={b.tcsAmount} negative hint="Tax collected at source" />}
            {!!b.tdsAmount && <Row label="TDS" value={b.tdsAmount} negative hint="Tax deducted at source" />}
            <Row label="Net payout" value={b.partnerPayout} strong />
          </dl>
          {b.settlementDueDate && <p className="mt-2 text-xs text-muted">Settlement due {formatDate(b.settlementDueDate)}</p>}
        </div>
      )}
    </div>
  );
}

export function BookingOverview({ b, showPayout = true, extra }: { b: BookingDetail; showPayout?: boolean; extra?: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Section title="Stay">
          <KeyValue
            items={[
              { label: "Property", value: b.property.name },
              { label: "City", value: b.property.cityName },
              { label: "Check-in", value: `${formatDate(b.checkIn, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}${b.property.checkInTime ? ` · ${b.property.checkInTime}` : ""}` },
              { label: "Check-out", value: `${formatDate(b.checkOut, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}${b.property.checkOutTime ? ` · ${b.property.checkOutTime}` : ""}` },
              { label: "Nights", value: b.nights },
              { label: "Guests", value: guestsLabel(b) },
            ]}
          />
        </Section>
        <Section title="Rooms" bodyClassName="p-0 sm:p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface-2/60 text-left text-xs text-muted uppercase">
                <tr>
                  <th className="px-4 py-2 font-semibold">Room / rate plan</th>
                  <th className="px-4 py-2 font-semibold">Qty</th>
                  <th className="px-4 py-2 font-semibold">Nightly</th>
                  <th className="px-4 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {b.rooms.map((r, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-ink">{r.roomTypeName}</p>
                      <p className="text-xs text-muted">{r.ratePlanName}</p>
                    </td>
                    <td className="px-4 py-2.5">{r.quantity}</td>
                    <td className="px-4 py-2.5 text-xs text-ink-2">
                      {r.nightlyPrices.map((n) => (
                        <span key={n.date} className="mr-2 inline-block whitespace-nowrap">
                          {formatDate(n.date, { day: "numeric", month: "short" })}: {formatINR(n.price)}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
        <Section title="Charges">
          <PriceBreakdown b={b} showPayout={showPayout} />
        </Section>
        {extra}
      </div>
      <div className="space-y-4">
        <Section title="Guest">
          <KeyValue
            cols={1}
            items={[
              { label: "Name", value: b.guestName },
              { label: "Email", value: b.guestEmail ? <a className="text-brand hover:underline" href={`mailto:${b.guestEmail}`}>{b.guestEmail}</a> : "—" },
              { label: "Phone", value: b.guestPhone ? <a className="text-brand hover:underline" href={`tel:${b.guestPhone}`}>{b.guestPhone}</a> : "—" },
              { label: "Special requests", value: b.specialRequests || "None" },
            ]}
          />
        </Section>
        <Section title="Timeline">
          <KeyValue
            cols={1}
            items={[
              { label: "Booked", value: formatDateTime(b.createdAt) },
              { label: "Confirmed", value: formatDateTime(b.confirmedAt) },
              ...(b.cancelledAt ? [{ label: "Cancelled", value: `${formatDateTime(b.cancelledAt)}${b.cancelReason ? ` — ${b.cancelReason}` : ""}` }] : []),
              ...(b.holdExpiresAt && b.status === "PENDING_PAYMENT" ? [{ label: "Hold expires", value: formatDateTime(b.holdExpiresAt) }] : []),
            ]}
          />
        </Section>
        <Section title="Cancellation policy">
          <PolicySummary policy={b.cancellationPolicy} />
        </Section>
      </div>
    </div>
  );
}

export function LedgerTable({ rows, loading, error, onRetry, pagination }: { rows: LedgerEntry[] | undefined; loading?: boolean; error?: { message: string } | null; onRetry?: () => void; pagination?: TablePagination }) {
  const columns: Column<LedgerEntry>[] = [
    { key: "date", header: "Date", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.createdAt)}</span>, sortValue: (r) => r.createdAt },
    { key: "type", header: "Type", cell: (r) => <span className="text-xs font-medium">{humanize(r.type)}</span>, sortValue: (r) => r.type },
    {
      key: "desc",
      header: "Description",
      cell: (r) => (
        <div className="min-w-0">
          <p className="line-clamp-2">{r.description ?? "—"}</p>
          {r.bookingCode && <p className="font-mono text-xs text-muted">{r.bookingCode}</p>}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (r) => <span className={cn("font-medium", r.amount < 0 ? "text-danger" : "text-success")}>{r.amount < 0 ? `− ${formatINR(-r.amount, { decimals: true })}` : `+ ${formatINR(r.amount, { decimals: true })}`}</span>,
      sortValue: (r) => r.amount,
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      pagination={pagination}
      dense
      empty={{ title: "No ledger entries", description: "Booking credits, commission, refunds and payouts are recorded here." }}
    />
  );
}

export function BookingLink({ code, id, portal }: { code: string; id?: string; portal: "admin" | "partner" }) {
  if (!id) return <span className="font-mono text-xs">{code}</span>;
  return (
    <Link href={`/${portal}/bookings/${id}`} className="font-mono text-xs text-brand hover:underline">
      {code}
    </Link>
  );
}
