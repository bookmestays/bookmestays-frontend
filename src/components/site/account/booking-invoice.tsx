"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { formatDate, formatINR } from "@/lib/format";
import type { BookingDetail } from "@/lib/types";

// Print-only invoice. Rendered straight into <body> so globals.css can hide the
// rest of the page (site header, footer, account nav) when printing, and
// `@page { margin: 0 }` drops the browser's own URL/date header and footer.

const inr = (paise: number) => formatINR(paise, { decimals: true });
const longDate = (d: string) => formatDate(d, { day: "numeric", month: "short", year: "numeric" });
const dayDate = (d: string) => formatDate(d, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

const STATUS_LABEL: Partial<Record<BookingDetail["status"], string>> = {
  PENDING_PAYMENT: "Payment pending",
  CONFIRMED: "Paid",
  CHECKED_IN: "Paid",
  COMPLETED: "Paid",
  CANCELLED: "Cancelled",
};

const noopSubscribe = () => () => {};

/** Prints the invoice with a sensible default PDF file name. */
export function printInvoice(code: string) {
  const previous = document.title;
  document.title = `BookMeStays-Invoice-${code}`;
  const restore = () => {
    document.title = previous;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}

export function BookingInvoice({ booking: b }: { booking: BookingDetail }) {
  // false during SSR/hydration, true on the client — the portal needs document.body
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return null;

  const inv = b.invoice;
  const pending = b.status === "PENDING_PAYMENT";
  const title = pending ? "Booking summary" : inv?.sellerGstin ? "Tax invoice" : "Booking invoice";
  const cgst = Math.round(b.roomTax / 2);
  const sgst = b.roomTax - cgst;
  const statusLabel = STATUS_LABEL[b.status] ?? b.status.replace(/_/g, " ").toLowerCase();
  const address = [b.property.address ?? b.property.cityName, inv?.propertyPincode].filter(Boolean).join(" – ");

  return createPortal(
    <div className="invoice-sheet text-[12px] leading-relaxed text-ink">
      {/* Header */}
      <header className="flex items-start justify-between gap-6 border-b-2 border-brand pb-5">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- must be loaded eagerly before printing */}
          <img src="/brand/logo.png" alt="BookMeStays" className="h-10 w-auto" />
          <p className="mt-2 text-[11px] text-muted">bookmestays.in</p>
        </div>
        <div className="text-right">
          <h1 className="text-[22px] font-bold uppercase tracking-wide text-brand">{title}</h1>
          <dl className="mt-1 grid grid-cols-[auto_auto] justify-end gap-x-3 text-[11px]">
            <dt className="text-muted">Invoice no.</dt>
            <dd className="font-mono font-semibold">INV-{b.code}</dd>
            <dt className="text-muted">Booking ref.</dt>
            <dd className="font-mono font-semibold">{b.code}</dd>
            <dt className="text-muted">Date</dt>
            <dd>{longDate(b.confirmedAt ?? b.createdAt)}</dd>
          </dl>
          <span
            className={`mt-2 inline-block rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              b.status === "CANCELLED" ? "bg-danger/10 text-danger" : pending ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </header>

      {/* Parties */}
      <section className="grid grid-cols-2 gap-6 py-5">
        <div>
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Billed to</h2>
          <p className="font-semibold">{b.guestName}</p>
          <p className="text-ink-2">{b.guestEmail}</p>
          <p className="text-ink-2">{b.guestPhone}</p>
        </div>
        <div>
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Property</h2>
          <p className="font-semibold">{b.property.name}</p>
          {inv?.sellerLegalName && inv.sellerLegalName !== b.property.name && <p className="text-ink-2">{inv.sellerLegalName}</p>}
          {address && <p className="text-ink-2">{address}</p>}
          {b.property.contactPhone && <p className="text-ink-2">Phone: {b.property.contactPhone}</p>}
          {inv?.sellerGstin && <p className="text-ink-2">GSTIN: <span className="font-mono">{inv.sellerGstin}</span></p>}
        </div>
      </section>

      {/* Stay */}
      <section className="grid grid-cols-4 gap-4 rounded-lg bg-surface-2 px-4 py-3">
        <Stat label="Check-in" value={dayDate(b.checkIn)} sub={b.property.checkInTime ? `from ${b.property.checkInTime}` : undefined} />
        <Stat label="Check-out" value={dayDate(b.checkOut)} sub={b.property.checkOutTime ? `until ${b.property.checkOutTime}` : undefined} />
        <Stat label="Duration" value={`${b.nights} night${b.nights === 1 ? "" : "s"}`} />
        <Stat
          label="Guests"
          value={`${b.adults} adult${b.adults === 1 ? "" : "s"}${b.children ? `, ${b.children} child${b.children === 1 ? "" : "ren"}` : ""}`}
        />
      </section>

      {/* Charges */}
      <table className="mt-5 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-ink/20 text-[10px] uppercase tracking-wider text-muted">
            <th className="py-2 font-semibold">Description</th>
            <th className="py-2 text-right font-semibold">Rooms</th>
            <th className="py-2 text-right font-semibold">Nights</th>
            <th className="py-2 text-right font-semibold">Avg. rate / night</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {b.rooms.map((r, i) => {
            const nights = r.nightlyPrices.length || b.nights;
            return (
              <tr key={i} className="border-b border-line align-top">
                <td className="py-2.5">
                  <p className="font-medium">{r.roomTypeName}</p>
                  <p className="text-[11px] text-muted">{r.ratePlanName}</p>
                </td>
                <td className="py-2.5 text-right">{r.quantity}</td>
                <td className="py-2.5 text-right">{nights}</td>
                <td className="py-2.5 text-right">{inr(Math.round(r.amount / Math.max(1, r.quantity * nights)))}</td>
                <td className="py-2.5 text-right font-medium">{inr(r.amount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-3 flex justify-end">
        <dl className="w-72 space-y-1">
          <Line label="Room charges" value={inr(b.roomAmount)} />
          {b.roomTax > 0 && (
            <>
              <Line label="CGST" value={inr(cgst)} />
              <Line label="SGST" value={inr(sgst)} />
            </>
          )}
          {b.addonsAmount > 0 && <Line label="Add-ons" value={inr(b.addonsAmount)} />}
          {b.discountAmount > 0 && <Line label="Discount" value={`− ${inr(b.discountAmount)}`} />}
          <div className="mt-2 flex justify-between border-t-2 border-ink pt-2 text-[14px] font-bold">
            <dt>{pending ? "Amount due" : "Total paid"}</dt>
            <dd>{inr(b.totalAmount)}</dd>
          </div>
          {b.refundAmount > 0 && <Line label="Refunded" value={inr(b.refundAmount)} className="font-medium text-success" />}
        </dl>
      </div>

      {/* Payment */}
      {!pending && (inv?.paymentReference || inv?.paymentMethod) && (
        <section className="mt-5 rounded-lg border border-line px-4 py-3 text-[11px]">
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Payment</h2>
          <p className="text-ink-2">
            {inv.paymentMethod && <>Paid by <span className="font-medium capitalize text-ink">{inv.paymentMethod}</span></>}
            {inv.paidAt && <> on {longDate(inv.paidAt)}</>}
            {inv.paymentReference && <> · Transaction ID <span className="font-mono text-ink">{inv.paymentReference}</span></>}
          </p>
        </section>
      )}

      {b.status === "CANCELLED" && (
        <p className="mt-4 rounded-lg bg-danger/5 px-4 py-2 text-[11px] text-danger">
          This booking was cancelled{b.cancelledAt ? ` on ${longDate(b.cancelledAt)}` : ""}
          {b.cancelReason ? ` — ${b.cancelReason}` : ""}.
        </p>
      )}

      {/* Notes */}
      <section className="mt-5 space-y-2 text-[11px] text-ink-2">
        {b.specialRequests && (
          <p>
            <span className="font-semibold text-ink">Special requests:</span> {b.specialRequests}
          </p>
        )}
        {b.cancellationPolicy?.summary && (
          <p>
            <span className="font-semibold text-ink">Cancellation policy:</span> {b.cancellationPolicy.summary}
          </p>
        )}
        <p>
          <span className="font-semibold text-ink">At check-in:</span> please carry a valid government photo ID for every adult guest.
        </p>
      </section>

      <footer className="mt-8 border-t border-line pt-3 text-center text-[10px] text-muted">
        This is a computer-generated invoice and does not require a signature. Thank you for booking with BookMeStays.
      </footer>
    </div>,
    document.body,
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="font-semibold">{value}</p>
      {sub && <p className="text-[10px] text-muted">{sub}</p>}
    </div>
  );
}

function Line({ label, value, className = "text-ink-2" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between ${className}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
