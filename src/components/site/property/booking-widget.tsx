"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate, formatINR } from "@/lib/format";
import { addDays, todayISO } from "@/lib/search-params";
import { GuestPicker } from "../search/guest-picker";
import { useBooking } from "./booking-context";

export function StayControls({ className, idPrefix }: { className?: string; idPrefix: string }) {
  const { stay, setStay } = useBooking();
  const [today] = useState(todayISO);
  const labelCls = "text-[11px] font-semibold tracking-wide text-muted uppercase";
  const inputCls = "w-full bg-transparent text-sm font-medium text-ink focus:outline-none";
  return (
    <div className={cn("grid grid-cols-2 overflow-visible rounded-xl border border-line", className)}>
      <div className="flex flex-col border-r border-b border-line px-3 py-2">
        <label htmlFor={`${idPrefix}-in`} className={labelCls}>
          Check-in
        </label>
        <input
          id={`${idPrefix}-in`}
          type="date"
          min={today}
          value={stay.checkIn}
          onChange={(e) => {
            const v = e.target.value;
            setStay({ checkIn: v, checkOut: v && (!stay.checkOut || stay.checkOut <= v) ? addDays(v, 1) : stay.checkOut });
          }}
          className={inputCls}
        />
      </div>
      <div className="flex flex-col border-b border-line px-3 py-2">
        <label htmlFor={`${idPrefix}-out`} className={labelCls}>
          Check-out
        </label>
        <input
          id={`${idPrefix}-out`}
          type="date"
          min={stay.checkIn ? addDays(stay.checkIn, 1) : today}
          value={stay.checkOut}
          onChange={(e) => setStay({ checkOut: e.target.value })}
          className={inputCls}
        />
      </div>
      <div className="col-span-2 px-3 py-2">
        <GuestPicker value={stay} onChange={(g) => setStay(g)} align="left" />
      </div>
    </div>
  );
}

function scrollToRooms() {
  document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Sticky booking card (desktop sidebar). */
export function BookingWidget({ startingPrice }: { startingPrice: number | null }) {
  const b = useBooking();
  const guests = b.stay.adults + b.stay.children;
  const capacityShort = b.totals.rooms > 0 && b.totals.capacity < guests;

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-lg">
      <div className="flex items-baseline justify-between gap-2">
        {b.totals.rooms > 0 ? (
          <p>
            <span className="text-2xl font-bold text-ink">{formatINR(b.totals.amount + b.totals.taxes)}</span>
            <span className="text-sm text-muted"> total</span>
          </p>
        ) : (
          <p>
            <span className="text-xs text-muted">From </span>
            <span className="text-2xl font-bold text-ink">{formatINR(startingPrice)}</span>
            <span className="text-sm text-muted"> /night</span>
          </p>
        )}
      </div>

      <StayControls idPrefix="widget" className="mt-4" />

      <div className="mt-4 space-y-2 text-sm">
        {!b.hasDates && <p className="text-muted">Select dates to see live prices and availability.</p>}
        {b.loading && (
          <p className="flex items-center gap-2 text-muted">
            <Spinner className="size-4" /> Checking availability…
          </p>
        )}
        {b.error && (
          <p className="flex items-start gap-2 text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {b.error}
          </p>
        )}
        {b.lines.map((l) => (
          <div key={l.ratePlanId} className="flex justify-between gap-3">
            <span className="text-ink-2">
              {l.quantity} × {l.roomTypeName}
              <span className="block text-xs text-muted">
                {l.plan.name} · {b.nights} night{b.nights === 1 ? "" : "s"}
              </span>
            </span>
            <span className="font-medium text-ink">{formatINR(l.plan.totalPrice * l.quantity)}</span>
          </div>
        ))}
        {b.totals.rooms > 0 && (
          <>
            <div className="flex justify-between gap-3 text-ink-2">
              <span>Taxes &amp; fees</span>
              <span>{formatINR(b.totals.taxes)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-line pt-2 font-semibold text-ink">
              <span>Total</span>
              <span>{formatINR(b.totals.amount + b.totals.taxes)}</span>
            </div>
          </>
        )}
        {capacityShort && (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
            Selected rooms sleep up to {b.totals.capacity} guests — you&apos;re searching for {guests}. Add another room.
          </p>
        )}
      </div>

      {b.totals.rooms > 0 ? (
        <Button variant="accent" size="lg" className="mt-4 w-full" onClick={() => void b.reserve()} loading={b.reserving} disabled={capacityShort}>
          Reserve {b.totals.rooms} room{b.totals.rooms === 1 ? "" : "s"}
        </Button>
      ) : (
        <Button variant="accent" size="lg" className="mt-4 w-full" onClick={scrollToRooms}>
          {b.hasDates ? "Select a room" : "Check availability"}
        </Button>
      )}
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
        <ShieldCheck className="size-3.5 text-success" aria-hidden /> Secure prepaid booking · Instant confirmation
      </p>
      {b.hasDates && (
        <p className="mt-1 text-center text-xs text-muted">
          {formatDate(b.stay.checkIn, { day: "numeric", month: "short" })} → {formatDate(b.stay.checkOut, { day: "numeric", month: "short" })}
        </p>
      )}
    </div>
  );
}

/** Sticky bottom bar on mobile. */
export function MobileBookingBar({ startingPrice }: { startingPrice: number | null }) {
  const b = useBooking();
  const guests = b.stay.adults + b.stay.children;
  const capacityShort = b.totals.rooms > 0 && b.totals.capacity < guests;
  return (
    <div className="mobile-book-bar fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="min-w-0">
          {b.totals.rooms > 0 ? (
            <>
              <p className="text-lg font-bold text-ink">{formatINR(b.totals.amount + b.totals.taxes)}</p>
              <p className="truncate text-xs text-muted">
                {b.totals.rooms} room{b.totals.rooms === 1 ? "" : "s"} · {b.nights} night{b.nights === 1 ? "" : "s"} · incl. taxes
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-ink">
                {formatINR(startingPrice)}
                <span className="text-xs font-normal text-muted"> /night</span>
              </p>
              <p className="text-xs text-muted">{b.hasDates ? "Choose a room below" : "Add dates for exact prices"}</p>
            </>
          )}
        </div>
        {b.totals.rooms > 0 ? (
          <Button variant="accent" size="lg" onClick={() => void b.reserve()} loading={b.reserving} disabled={capacityShort}>
            Reserve
          </Button>
        ) : (
          <Button variant="accent" size="lg" onClick={scrollToRooms}>
            {b.hasDates ? "Select room" : "Check dates"}
          </Button>
        )}
      </div>
    </div>
  );
}
