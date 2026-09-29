"use client";

// Change dates / guests / rooms of a confirmed booking. Shared by the guest account page and the admin panel.
//   1. pick dates + guests → load room options (public availability)
//   2. choose rooms → quote (difference: pay / refund / none)
//   3. confirm → guest pays the difference (Razorpay or dev MOCK); admin can waive it or send the guest a payment link.

import { ArrowRight, CalendarDays, CheckCircle2, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format";
import type {
  AvailabilityResponse,
  BookingDetail,
  BookingModification,
  ModificationQuote,
  ModifyInput,
  ModifyResponse,
  PaymentOrder,
} from "@/lib/types";
import { MEAL_PLAN_LABELS } from "@/lib/types";
import { Badge, Button, Checkbox, Field, Input, Textarea } from "@/components/ui";
import { openRazorpayCheckout } from "@/components/site/booking/payment";

type Mode = { kind: "guest" } | { kind: "admin"; bookingId: string };

const today = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <Button size="sm" variant="outline" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus className="size-4" />
      </Button>
      <span className="w-6 text-center tabular-nums">{value}</span>
      <Button size="sm" variant="outline" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

export function ModifyBookingForm({
  booking,
  mode,
  onDone,
  onCancel,
}: {
  booking: BookingDetail;
  mode: Mode;
  /** Called with the updated booking once a change is applied (or requested, for admin payment links). */
  onDone: (b: BookingDetail, modification: BookingModification) => void;
  onCancel: () => void;
}) {
  const base = mode.kind === "guest" ? `/bookings/${booking.code}` : `/admin/bookings/${mode.bookingId}`;
  const [checkIn, setCheckIn] = useState(booking.checkIn);
  const [checkOut, setCheckOut] = useState(booking.checkOut);
  const [adults, setAdults] = useState(booking.adults);
  const [children, setChildren] = useState(booking.children);
  const [avail, setAvail] = useState<AvailabilityResponse | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({}); // `${roomTypeId}:${ratePlanId}` → rooms
  const [quote, setQuote] = useState<ModificationQuote | null>(null);
  const [waive, setWaive] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<null | "rooms" | "quote" | "confirm" | "pay">(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ modification: BookingModification; payment: PaymentOrder } | null>(null);
  const [done, setDone] = useState<BookingModification | null>(null);

  const datesValid = checkIn >= today() && checkOut > checkIn;
  const selection: ModifyInput["rooms"] = Object.entries(qty)
    .filter(([, q]) => q > 0)
    .map(([key, quantity]) => {
      const [roomTypeId, ratePlanId] = key.split(":");
      return { roomTypeId, ratePlanId, quantity };
    });
  const input: ModifyInput = { checkIn, checkOut, adults, children, rooms: selection };

  const loadRooms = async () => {
    setError(null);
    setQuote(null);
    setBusy("rooms");
    try {
      const a = await api<AvailabilityResponse>(`/public/properties/${booking.property.slug}/availability`, {
        query: { checkIn, checkOut, adults, children, rooms: 1 },
      });
      setAvail(a);
      // Pre-select the rooms the guest has now (matched by name — the booking stores names, not ids)
      if (!selection.length) {
        const next: Record<string, number> = {};
        for (const r of booking.rooms) {
          const rt = a.roomTypes.find((x) => x.name === r.roomTypeName);
          const rp = rt?.ratePlans.find((x) => x.name === r.ratePlanName);
          if (rt && rp) next[`${rt.id}:${rp.ratePlanId}`] = (next[`${rt.id}:${rp.ratePlanId}`] ?? 0) + r.quantity;
        }
        setQty(next);
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const getQuote = async () => {
    setError(null);
    setBusy("quote");
    try {
      setQuote(await api<ModificationQuote>(`${base}/modify/quote`, { method: "POST", body: input }));
    } catch (e) {
      setQuote(null);
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const verifyUrl = (modificationId: string) => `/bookings/${booking.code}/modify/${modificationId}/verify-payment`;
  const finishPaid = (r: { booking: BookingDetail; modification: BookingModification }) => {
    setDone(r.modification);
    onDone(r.booking, r.modification);
  };

  const pay = async (p: { modification: BookingModification; payment: PaymentOrder }) => {
    setError(null);
    setBusy("pay");
    try {
      const verify = (body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
        api<{ booking: BookingDetail; modification: BookingModification }>(verifyUrl(p.modification.id), { method: "POST", body });
      const r =
        p.payment.keyId === "MOCK"
          ? await verify({ razorpayOrderId: p.payment.orderId, razorpayPaymentId: `pay_mock_${Math.random().toString(36).slice(2, 12)}`, razorpaySignature: "MOCK" })
          : await openRazorpayCheckout(p.payment, { description: `Change to booking ${booking.code}`, notes: { bookingCode: booking.code }, verify });
      finishPaid(r);
    } catch (e) {
      const err = e as { dismissed?: boolean; failed?: string };
      if (!err?.dismissed) setError(err?.failed ?? errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    setError(null);
    setBusy("confirm");
    try {
      const body = mode.kind === "admin" ? { ...input, waiveDifference: waive, reason: reason.trim() || undefined } : input;
      const r = await api<ModifyResponse>(`${base}/modify`, { method: "POST", body });
      if (r.payment && mode.kind === "guest") {
        setPending({ modification: r.modification, payment: r.payment });
        setBusy(null);
        await pay({ modification: r.modification, payment: r.payment });
        return;
      }
      setDone(r.modification);
      onDone(r.booking, r.modification);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  // ─── Result ────────────────────────────────────────────────────────────
  if (done) {
    const waitingForGuest = done.status === "PENDING_PAYMENT";
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <h3 className="text-lg font-semibold text-ink">{waitingForGuest ? "Payment link sent to the guest" : "Booking updated"}</h3>
        <p className="text-sm text-ink-2">
          {formatDate(done.to.checkIn)} → {formatDate(done.to.checkOut)} · new total {formatINR(done.to.totalAmount)}
        </p>
        <p className="text-sm text-muted">
          {waitingForGuest
            ? `The change is applied once the guest pays ${formatINR(done.difference)}. The extra rooms are held until ${done.holdExpiresAt ? new Date(done.holdExpiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "the hold expires"}.`
            : done.action === "REFUND" && !done.waived
              ? `${formatINR(-done.difference)} will be refunded to the original payment method in 5–7 working days.`
              : done.action === "PAY" && !done.waived
                ? `Paid ${formatINR(done.difference)}. A confirmation email is on its way.`
                : "A confirmation email is on its way."}
        </p>
        <Button onClick={onCancel}>Close</Button>
      </div>
    );
  }

  // ─── Form ──────────────────────────────────────────────────────────────
  const maxGuests = 20;
  return (
    <div className="space-y-5">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-ink">New dates & guests</legend>
        <Field label="Check-in">
          <Input
            type="date"
            min={today()}
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value);
              if (checkOut <= e.target.value) setCheckOut(addDays(e.target.value, 1));
              setAvail(null);
              setQuote(null);
            }}
          />
        </Field>
        <Field label="Check-out">
          <Input
            type="date"
            min={addDays(checkIn, 1)}
            value={checkOut}
            onChange={(e) => {
              setCheckOut(e.target.value);
              setAvail(null);
              setQuote(null);
            }}
          />
        </Field>
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
          <span className="text-sm text-ink">Adults</span>
          <Stepper label="adults" value={adults} min={1} max={maxGuests} onChange={(v) => (setAdults(v), setAvail(null), setQuote(null))} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
          <span className="text-sm text-ink">Children</span>
          <Stepper label="children" value={children} min={0} max={maxGuests} onChange={(v) => (setChildren(v), setAvail(null), setQuote(null))} />
        </div>
      </fieldset>

      {!avail && (
        <Button onClick={loadRooms} loading={busy === "rooms"} disabled={!datesValid} className="w-full">
          <CalendarDays className="size-4" /> Check rooms for these dates
        </Button>
      )}

      {avail && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink">Rooms</p>
          {avail.roomTypes.map((rt) => (
            <div key={rt.id} className="rounded-lg border border-line p-3">
              <p className="font-medium text-ink">{rt.name}</p>
              <ul className="mt-2 space-y-2">
                {rt.ratePlans.map((rp) => {
                  const key = `${rt.id}:${rp.ratePlanId}`;
                  const q = qty[key] ?? 0;
                  return (
                    <li key={key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="text-ink">
                          {rp.name}
                          {MEAL_PLAN_LABELS[rp.mealPlan] !== rp.name && <span className="text-muted"> · {MEAL_PLAN_LABELS[rp.mealPlan]}</span>}
                        </p>
                        <p className="text-xs text-muted">
                          {formatINR(rp.avgNightly)}/night
                          {!rp.bookable && rp.reason && q === 0 ? <Badge tone="warning" className="ml-2">{rp.reason}</Badge> : null}
                        </p>
                      </div>
                      <Stepper
                        label={`${rt.name} ${rp.name} rooms`}
                        value={q}
                        min={0}
                        max={10}
                        onChange={(v) => {
                          setQty((x) => ({ ...x, [key]: v }));
                          setQuote(null);
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="text-xs text-muted">Rooms you already hold count as available — the price check below is final.</p>
          {!quote && (
            <Button onClick={getQuote} loading={busy === "quote"} disabled={!selection.length} className="w-full">
              See new price
            </Button>
          )}
        </div>
      )}

      {quote && (
        <div className="space-y-3 rounded-xl bg-surface-2 p-4 text-sm">
          <div className="flex justify-between text-ink-2">
            <span>Current total</span>
            <span className="tabular-nums">{formatINR(quote.currentTotal)}</span>
          </div>
          <div className="flex justify-between text-ink-2">
            <span>
              New total <span className="text-muted">({quote.nights} night{quote.nights > 1 ? "s" : ""}, incl. taxes)</span>
            </span>
            <span className="tabular-nums">{formatINR(quote.totalAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-ink">
            <span>{quote.action === "PAY" ? "To pay now" : quote.action === "REFUND" ? "You get back" : "Price difference"}</span>
            <span className={quote.action === "REFUND" ? "text-success" : undefined}>{formatINR(Math.abs(quote.difference))}</span>
          </div>
          {quote.action === "REFUND" && <p className="text-xs text-muted">Refunded to the original payment method in 5–7 working days.</p>}
          <p className="text-xs text-muted">Cancellation policy after the change: {quote.cancellationPolicy.summary}</p>
          {mode.kind === "admin" && quote.action !== "NONE" && (
            <>
              <Checkbox
                checked={waive}
                onChange={(e) => setWaive(e.target.checked)}
                label={quote.action === "PAY" ? "Waive the difference (BookMeStays absorbs it)" : "Don't refund the difference"}
              />
              {quote.action === "PAY" && !waive && <p className="text-xs text-muted">The guest is emailed a link to pay the difference; the change applies once paid.</p>}
            </>
          )}
          {mode.kind === "admin" && (
            <Field label="Reason (internal)">
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Guest called to extend by one night" />
            </Field>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onCancel} disabled={busy === "pay"}>
          Keep current booking
        </Button>
        {pending ? (
          <Button onClick={() => pay(pending)} loading={busy === "pay"}>
            {pending.payment.keyId === "MOCK" ? "Simulate successful payment (dev)" : `Pay ${formatINR(pending.payment.amount)}`}
          </Button>
        ) : (
          quote && (
            <Button onClick={confirm} loading={busy === "confirm"}>
              {quote.action === "PAY" && !(mode.kind === "admin" && waive)
                ? mode.kind === "guest"
                  ? `Confirm & pay ${formatINR(quote.difference)}`
                  : "Send payment link"
                : "Confirm change"}
              <ArrowRight className="size-4" />
            </Button>
          )
        )}
      </div>
    </div>
  );
}

/** Banner for a change waiting for the guest's payment (guest account page). */
export function PendingModificationNotice({
  booking,
  modification,
  onPaid,
}: {
  booking: BookingDetail;
  modification: BookingModification;
  onPaid: (b: BookingDetail) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const order =
        modification.payment ?? (await api<PaymentOrder>(`/bookings/${booking.code}/modify/${modification.id}/payment`, { method: "POST" }));
      const verify = (body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
        api<{ booking: BookingDetail; modification: BookingModification }>(`/bookings/${booking.code}/modify/${modification.id}/verify-payment`, { method: "POST", body });
      const r =
        order.keyId === "MOCK"
          ? await verify({ razorpayOrderId: order.orderId, razorpayPaymentId: `pay_mock_${Math.random().toString(36).slice(2, 12)}`, razorpaySignature: "MOCK" })
          : await openRazorpayCheckout(order, { description: `Change to booking ${booking.code}`, notes: { bookingCode: booking.code }, verify });
      onPaid(r.booking);
    } catch (e) {
      const err = e as { dismissed?: boolean; failed?: string };
      if (!err?.dismissed) setError(err?.failed ?? errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
      <p className="font-semibold text-ink">A change to this booking is waiting for payment</p>
      <p className="mt-1 text-ink-2">
        New stay {formatDate(modification.to.checkIn)} → {formatDate(modification.to.checkOut)}. Pay {formatINR(modification.difference)} to confirm it
        {modification.holdExpiresAt
          ? ` before ${new Date(modification.holdExpiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
          : ""}
        .
      </p>
      {error && <p className="mt-2 text-danger">{error}</p>}
      <Button className="mt-3" size="sm" onClick={pay} loading={busy}>
        {modification.payment?.keyId === "MOCK" ? "Simulate successful payment (dev)" : `Pay ${formatINR(modification.difference)}`}
      </Button>
    </div>
  );
}
