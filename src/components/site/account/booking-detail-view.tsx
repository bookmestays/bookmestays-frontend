"use client";

import { CalendarDays, CheckCircle2, Clock, Mail, MapPin, Navigation, Phone, Printer, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonClass, Card, EmptyState, ErrorState, Modal, Skeleton } from "@/components/ui";
import { ModifyBookingForm, PendingModificationNotice } from "@/components/booking/modify-booking-form";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format";
import type { BookingDetail, ModificationsResponse, PaymentOrder } from "@/lib/types";
import { HoldTimer, useCountdown } from "../booking/hold-timer";
import { isMockPayment, payWithRazorpay, simulateMockPayment } from "../booking/payment";
import { directionsUrl } from "../map-embed";
import { SmartImage } from "../media/smart-image";
import { PolicyRules } from "../property/property-sections";
import { CancelBookingModal, ReviewModal } from "./booking-modals";
import { BookingStatusBadge } from "./booking-status";

export function useBookingDetail(code: string) {
  const [state, setState] = useState<{ key: string; data: BookingDetail | null; error: { status: number; message: string } | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${code}|${attempt}`;
  useEffect(() => {
    let cancelled = false;
    api<BookingDetail>(`/bookings/${code}`)
      .then((data) => !cancelled && setState({ key, data, error: null }))
      .catch((e) => !cancelled && setState({ key, data: null, error: { status: e instanceof ApiError ? e.status : 0, message: e instanceof ApiError ? e.message : "Network error" } }));
    return () => {
      cancelled = true;
    };
  }, [code, key]);
  const current = state?.key === key ? state : null;
  return {
    booking: current?.data ?? state?.data ?? null,
    loading: !current,
    error: current?.error ?? null,
    reload: () => setAttempt((a) => a + 1),
    set: (b: BookingDetail) => setState({ key, data: b, error: null }),
  };
}

/** Change eligibility + history for a booking (re-fetched whenever the booking's stay or total changes). */
function useModifications(code: string | null, checkIn?: string, total?: number) {
  const [state, setState] = useState<{ key: string; data: ModificationsResponse } | null>(null);
  const key = `${code}|${checkIn}|${total}`;
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    api<ModificationsResponse>(`/bookings/${code}/modifications`)
      .then((data) => !cancelled && setState({ key, data }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [code, key]);
  return code && state?.key === key ? state.data : null;
}

export function BookingDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between gap-3 border-t border-line pt-2 text-base font-bold text-ink" : "flex justify-between gap-3 text-ink-2"}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function BookingDetailView({ code, variant }: { code: string; variant: "confirmation" | "account" }) {
  const { booking: b, loading, error, reload, set } = useBookingDetail(code);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const holdLeft = useCountdown(b?.status === "PENDING_PAYMENT" ? b.holdExpiresAt : null);
  const [modifyOpen, setModifyOpen] = useState(false);
  const mods = useModifications(variant === "account" && b?.status === "CONFIRMED" ? code : null, b?.checkIn, b?.totalAmount);

  if (loading && !b) return <BookingDetailSkeleton />;
  if (error && !b) {
    if (error.status === 404)
      return (
        <EmptyState
          title="Booking not found"
          description="We couldn't find a booking with this reference on your account."
          action={
            <Link href="/account/bookings" className={buttonClass("primary")}>
              My bookings
            </Link>
          }
        />
      );
    return <ErrorState message={error.status ? error.message : "We couldn't load your booking. Check your connection and try again."} onRetry={reload} />;
  }
  if (!b) return null;

  const isNewlyConfirmed = variant === "confirmation" && (b.status === "CONFIRMED" || b.status === "CHECKED_IN");
  const pending = b.status === "PENDING_PAYMENT";
  const upcoming = b.status === "CONFIRMED";
  const holdActive = pending && (holdLeft ?? 0) > 0;

  const completePayment = async () => {
    setPayBusy(true);
    setPayError(null);
    try {
      const o = order ?? (await api<PaymentOrder>(`/bookings/${b.code}/retry-payment`, { method: "POST" }));
      setOrder(o);
      const confirmed = isMockPayment(o) ? await simulateMockPayment(b.code, o) : await payWithRazorpay(b.code, o, b.property.name);
      set(confirmed);
    } catch (e) {
      const err = e as { dismissed?: boolean; failed?: string; message?: string };
      setPayError(err.dismissed ? "Payment was cancelled." : (err.failed ?? err.message ?? "Payment failed. Please try again."));
    } finally {
      setPayBusy(false);
    }
  };

  const pendingChange = mods?.items.find((m) => m.status === "PENDING_PAYMENT" && m.holdExpiresAt && new Date(m.holdExpiresAt) > new Date());

  return (
    <div className="space-y-5 print:space-y-3">
      {pendingChange && variant === "account" && (
        <PendingModificationNotice booking={b} modification={pendingChange} onPaid={(next) => set(next)} />
      )}
      {isNewlyConfirmed && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-success/10 px-6 py-8 text-center">
          <CheckCircle2 className="size-12 text-success" aria-hidden />
          <h1 className="text-2xl font-bold text-ink">Your stay is booked!</h1>
          <p className="text-sm text-ink-2">
            Booking reference <span className="font-mono font-semibold text-ink">{b.code}</span> · A confirmation has been sent to {b.guestEmail}
          </p>
        </div>
      )}
      {variant === "confirmation" && pending && (
        <div role="status" className="rounded-2xl border border-warning/30 bg-warning/10 p-5 text-sm">
          <p className="font-semibold text-ink">We&apos;re confirming your payment…</p>
          <p className="mt-1 text-ink-2">This usually takes a few seconds. You&apos;ll also get an email once it&apos;s confirmed.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={reload}>
            Refresh status
          </Button>
        </div>
      )}

      {variant === "account" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">{b.property.name}</h1>
            <p className="text-sm text-muted">
              Booking <span className="font-mono font-semibold text-ink">{b.code}</span> · booked {formatDate(b.createdAt)}
            </p>
          </div>
          <BookingStatusBadge status={b.status} />
        </div>
      )}

      {pending && variant === "account" && (
        <Card className="space-y-3 border-warning/40 p-5">
          {holdActive ? (
            <>
              <HoldTimer expiresAt={b.holdExpiresAt!} />
              <p className="text-sm text-ink-2">Your rooms are on hold. Complete the payment to confirm this booking.</p>
              {payError && <p className="text-sm text-danger">{payError}</p>}
              <Button onClick={completePayment} loading={payBusy}>
                {order && isMockPayment(order) ? "Simulate successful payment (dev)" : `Pay ${formatINR(b.totalAmount)}`}
              </Button>
            </>
          ) : (
            <p className="text-sm text-ink-2">The hold on this booking has expired and no payment was taken.</p>
          )}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="grid gap-4 p-5 sm:grid-cols-[160px_minmax(0,1fr)]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-2 print:hidden">
            <SmartImage src={b.property.coverImageUrl} alt={b.property.name} fill sizes="160px" className="object-cover" />
          </div>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link href={`/stays/${b.property.slug}`} className="text-lg font-semibold text-ink hover:underline">
                  {b.property.name}
                </Link>
                {(b.property.address || b.property.cityName) && (
                  <p className="flex items-start gap-1 text-sm text-muted">
                    <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {b.property.address ?? b.property.cityName}
                  </p>
                )}
              </div>
              {variant === "confirmation" && <BookingStatusBadge status={b.status} />}
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <p className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 size-4 text-muted" aria-hidden />
                <span>
                  <span className="block text-xs text-muted">Check-in</span>
                  <span className="font-medium text-ink">{formatDate(b.checkIn, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                  {b.property.checkInTime && <span className="block text-xs text-muted">from {b.property.checkInTime}</span>}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 size-4 text-muted" aria-hidden />
                <span>
                  <span className="block text-xs text-muted">Check-out</span>
                  <span className="font-medium text-ink">{formatDate(b.checkOut, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                  {b.property.checkOutTime && <span className="block text-xs text-muted">until {b.property.checkOutTime}</span>}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Users className="mt-0.5 size-4 text-muted" aria-hidden />
                <span>
                  <span className="block text-xs text-muted">Guests</span>
                  <span className="font-medium text-ink">
                    {b.adults} adult{b.adults === 1 ? "" : "s"}
                    {b.children ? `, ${b.children} child${b.children === 1 ? "" : "ren"}` : ""}
                  </span>
                  <span className="block text-xs text-muted">
                    {b.nights} night{b.nights === 1 ? "" : "s"} · {b.roomsLabel}
                  </span>
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-6 border-t border-line p-5 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <h2 className="font-semibold text-ink">Price details</h2>
            {b.rooms.map((r, i) => (
              <Row key={i} label={`${r.quantity} × ${r.roomTypeName} (${r.ratePlanName})`} value={formatINR(r.amount)} />
            ))}
            <Row label="Taxes (GST)" value={formatINR(b.roomTax)} />
            {b.addonsAmount > 0 && <Row label="Add-ons" value={formatINR(b.addonsAmount)} />}
            {b.discountAmount > 0 && <Row label="Discount" value={`− ${formatINR(b.discountAmount)}`} />}
            <Row label={pending ? "Amount due" : "Total paid"} value={formatINR(b.totalAmount)} strong />
            {b.refundAmount > 0 && <p className="text-sm font-medium text-success">Refund: {formatINR(b.refundAmount)}</p>}
          </div>
          <div className="space-y-2 text-sm">
            <h2 className="font-semibold text-ink">Lead guest</h2>
            <p className="text-ink-2">{b.guestName}</p>
            <p className="flex items-center gap-2 text-ink-2">
              <Mail className="size-4 text-muted" aria-hidden /> {b.guestEmail}
            </p>
            <p className="flex items-center gap-2 text-ink-2">
              <Phone className="size-4 text-muted" aria-hidden /> {b.guestPhone}
            </p>
            {b.specialRequests && <p className="text-ink-2">Requests: {b.specialRequests}</p>}
            {b.status === "CANCELLED" && (
              <p className="rounded-lg bg-danger/5 p-2 text-danger">
                Cancelled {b.cancelledAt ? formatDate(b.cancelledAt) : ""}
                {b.cancelReason ? ` — ${b.cancelReason}` : ""}
              </p>
            )}
          </div>
        </div>
      </Card>

      {(upcoming || isNewlyConfirmed) && (
        <Card className="p-5">
          <h2 className="font-semibold text-ink">What happens next</h2>
          <ol className="mt-3 space-y-2 text-sm text-ink-2">
            <li className="flex gap-2">
              <span className="font-semibold text-ink">1.</span> Your confirmation and invoice are in your email and in My bookings.
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-ink">2.</span> Carry a government photo ID for every adult guest at check-in.
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-ink">3.</span>
              <span>
                Arrive from {b.property.checkInTime ?? "the check-in time"}.
                {b.property.contactPhone && (
                  <>
                    {" "}
                    Property contact: <a href={`tel:${b.property.contactPhone}`} className="text-brand">{b.property.contactPhone}</a>
                  </>
                )}
              </span>
            </li>
          </ol>
          {b.property.lat != null && b.property.lng != null && (
            <a href={directionsUrl(b.property.lat, b.property.lng)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline print:hidden">
              <Navigation className="size-4" aria-hidden /> Get directions
            </a>
          )}
        </Card>
      )}

      {b.cancellationPolicy && (
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <Clock className="size-4" aria-hidden /> Cancellation policy
          </h2>
          <div className="mt-2">
            <PolicyRules policy={b.cancellationPolicy} />
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden /> Print / download PDF
        </Button>
        {variant === "confirmation" ? (
          <Link href={`/account/bookings/${b.code}`} className={buttonClass("outline")}>
            Manage booking
          </Link>
        ) : null}
        {upcoming && variant === "account" && mods?.canModify && (
          <Button variant="outline" onClick={() => setModifyOpen(true)}>
            <CalendarDays className="size-4" aria-hidden /> Change dates or rooms
          </Button>
        )}
        {(upcoming || pending) && variant === "account" && (
          <Button variant="ghost" className="text-danger" onClick={() => setCancelOpen(true)}>
            Cancel booking
          </Button>
        )}
        {b.status === "COMPLETED" && b.canReview !== false && !reviewed && (
          <Button onClick={() => setReviewOpen(true)}>Write a review</Button>
        )}
        <Link href="/help#booking-support" className={buttonClass("ghost")}>
          Need help?
        </Link>
      </div>

      <Modal open={modifyOpen} onClose={() => setModifyOpen(false)} title="Change your booking" size="lg">
        {modifyOpen && (
          <ModifyBookingForm
            booking={b}
            mode={{ kind: "guest" }}
            onDone={(next) => set(next)}
            onCancel={() => setModifyOpen(false)}
          />
        )}
      </Modal>
      <CancelBookingModal booking={b} open={cancelOpen} onClose={() => setCancelOpen(false)} onCancelled={set} />
      <ReviewModal bookingCode={b.code} propertyName={b.property.name} open={reviewOpen} onClose={() => setReviewOpen(false)} onDone={() => setReviewed(true)} />
    </div>
  );
}
