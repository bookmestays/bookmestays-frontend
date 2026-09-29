"use client";

import { AlertTriangle, BadgePercent, CalendarDays, CreditCard, Lock, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, buttonClass, Card, Checkbox, Field, Input, Skeleton, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { formatDate, formatINR } from "@/lib/format";
import { filtersToQuery, guestsLabel } from "@/lib/search-params";
import type { BookingDetail, BookingInput, CancellationPolicy, PaymentOrder, PriceQuote } from "@/lib/types";
import { useAuth } from "../auth-context";
import { SmartImage } from "../media/smart-image";
import type { Selection } from "./selections";
import { PolicyRules } from "../property/property-sections";
import { HoldTimer, useCountdown } from "./hold-timer";
import { isMockPayment, payWithRazorpay, simulateMockPayment } from "./payment";

export type CheckoutProperty = {
  id: string;
  slug: string;
  name: string;
  location: string;
  coverImageUrl: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  cancellationPolicy: CancellationPolicy | null;
};

type Stage = "form" | "paying" | "failed" | "expired";
const errMsg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

function Step({ n, title, children, done }: { n: number; title: string; children: React.ReactNode; done?: boolean }) {
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-3 text-lg font-semibold text-ink">
        <span className={cn("flex size-7 items-center justify-center rounded-full text-sm", done ? "bg-success text-white" : "bg-ink text-white")}>{n}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function CheckoutFlow({
  property,
  checkIn,
  checkOut,
  adults,
  childCount,
  selections,
}: {
  property: CheckoutProperty;
  checkIn: string;
  checkOut: string;
  adults: number;
  childCount: number;
  selections: Selection[];
}) {
  const router = useRouter();
  const { user, status, openLogin } = useAuth();
  const backHref = `/stays/${property.slug}?${filtersToQuery({ checkIn, checkOut, adults, children: childCount })}#rooms`;

  const input: BookingInput = { propertyId: property.id, checkIn, checkOut, adults, children: childCount, rooms: selections };
  const inputKey = JSON.stringify(input);

  // ─── Quote ───
  const [couponDraft, setCouponDraft] = useState("");
  const [coupon, setCoupon] = useState<string | undefined>(undefined);
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const quoteKey = `${inputKey}|${coupon ?? ""}|${quoteAttempt}`;
  const [quoteRes, setQuoteRes] = useState<{ key: string; quote: PriceQuote | null; error: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const body: BookingInput = { ...(JSON.parse(inputKey) as BookingInput), couponCode: coupon };
    api<PriceQuote>("/bookings/quote", { method: "POST", body })
      .then((q) => !cancelled && setQuoteRes({ key: quoteKey, quote: q, error: null }))
      .catch((e) => !cancelled && setQuoteRes({ key: quoteKey, quote: null, error: errMsg(e, "We couldn't price this stay right now. Please try again.") }));
    return () => {
      cancelled = true;
    };
  }, [quoteKey, inputKey, coupon]);

  const current = quoteRes?.key === quoteKey ? quoteRes : null;
  const quote = current?.quote ?? (quoteRes?.quote && !current ? quoteRes.quote : null);
  const quoteLoading = !current;
  const quoteError = current?.error ?? null;

  // ─── Guest details ───
  const [guest, setGuest] = useState<{ name: string; email: string; phone: string } | null>(null);
  const g = guest ?? { name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" };
  const [requests, setRequests] = useState("");
  const [agree, setAgree] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ─── Booking / payment ───
  const [stage, setStage] = useState<Stage>("form");
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const secondsLeft = useCountdown(order?.holdExpiresAt);
  const holdExpired = secondsLeft === 0;

  const finish = (b: BookingDetail) => {
    track("payment_completed", { bookingCode: b.code, amount: b.totalAmount, propertyId: property.id });
    router.replace(`/checkout/confirmation/${b.code}`);
  };

  const pay = async (b: BookingDetail, o: PaymentOrder) => {
    setPayError(null);
    if (isMockPayment(o)) {
      setStage("paying");
      return; // the mock panel renders a "Simulate successful payment" button
    }
    setStage("paying");
    try {
      const confirmed = await payWithRazorpay(b.code, o, `${property.name} · ${b.nights} night${b.nights === 1 ? "" : "s"}`);
      finish(confirmed);
    } catch (e) {
      const err = e as { dismissed?: boolean; failed?: string; message?: string };
      setStage("failed");
      setPayError(err.dismissed ? "Payment was cancelled. Your rooms are still on hold — you can try again." : (err.failed ?? err.message ?? "Payment failed. Please try again."));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const u = user ?? (await openLogin("Sign in to complete your booking. We'll keep your selection."));
    if (!u) return;
    if (g.name.trim().length < 2) return setFormError("Please enter the lead guest's full name.");
    if (!/^\S+@\S+\.\S+$/.test(g.email.trim())) return setFormError("Please enter a valid email for your confirmation.");
    if (!/^\+?[\d\s-]{10,15}$/.test(g.phone.trim())) return setFormError("Please enter a valid mobile number.");
    if (!agree) return setFormError("Please accept the cancellation policy and terms to continue.");
    if (!quote) return setFormError("Price is still loading — please wait a moment.");
    setBusy(true);
    try {
      const res = await api<{ booking: BookingDetail; payment: PaymentOrder }>("/bookings", {
        method: "POST",
        body: { ...input, couponCode: quote.coupon?.code, guest: { name: g.name.trim(), email: g.email.trim(), phone: g.phone.trim() }, specialRequests: requests.trim() || undefined },
      });
      setBooking(res.booking);
      setOrder(res.payment);
      await pay(res.booking, res.payment);
    } catch (err) {
      const msg = errMsg(err, "We couldn't create your booking. Please try again.");
      setFormError(err instanceof ApiError && err.status === 409 ? `${msg} Please go back and choose different rooms or dates.` : msg);
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    if (!booking) return;
    setBusy(true);
    setPayError(null);
    try {
      const o = await api<PaymentOrder>(`/bookings/${booking.code}/retry-payment`, { method: "POST" });
      setOrder(o);
      await pay(booking, o);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 409 || e.status === 410)) setStage("expired");
      else {
        setStage("failed");
        setPayError(errMsg(e, "Couldn't restart payment. Please try again."));
      }
    } finally {
      setBusy(false);
    }
  };

  const simulate = async () => {
    if (!booking || !order) return;
    setBusy(true);
    try {
      finish(await simulateMockPayment(booking.code, order));
    } catch (e) {
      setStage("failed");
      setPayError(errMsg(e, "Mock payment failed."));
    } finally {
      setBusy(false);
    }
  };

  const locked = stage !== "form";
  const policy = quote?.cancellationPolicy ?? property.cancellationPolicy;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <Step n={1} title="Your stay" done>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <p className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 text-muted" aria-hidden />
              <span>
                <span className="block text-xs text-muted">Check-in</span>
                <span className="font-medium text-ink">{formatDate(checkIn, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                {property.checkInTime && <span className="block text-xs text-muted">from {property.checkInTime}</span>}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 text-muted" aria-hidden />
              <span>
                <span className="block text-xs text-muted">Check-out</span>
                <span className="font-medium text-ink">{formatDate(checkOut, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                {property.checkOutTime && <span className="block text-xs text-muted">until {property.checkOutTime}</span>}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Users className="mt-0.5 size-4 text-muted" aria-hidden />
              <span>
                <span className="block text-xs text-muted">Guests</span>
                <span className="font-medium text-ink">{guestsLabel(adults, childCount)}</span>
                <span className="block text-xs text-muted">
                  {adults} adult{adults === 1 ? "" : "s"}
                  {childCount ? `, ${childCount} child${childCount === 1 ? "" : "ren"}` : ""}
                </span>
              </span>
            </p>
          </div>
          {!locked && (
            <Link href={backHref} className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
              Change dates, guests or rooms
            </Link>
          )}
        </Step>

        <form onSubmit={submit} noValidate className="space-y-4">
          <Step n={2} title="Guest details">
            {status !== "loading" && !user ? (
              <div className="flex flex-col items-start gap-3 rounded-xl bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-2">Sign in with a one-time code to continue — it takes 30 seconds and your selection is saved.</p>
                <Button type="button" onClick={() => void openLogin("Sign in to complete your booking.")}>
                  Sign in to continue
                </Button>
              </div>
            ) : (
              <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
                <Field label="Lead guest name" required className="sm:col-span-2">
                  <Input autoComplete="name" value={g.name} onChange={(e) => setGuest({ ...g, name: e.target.value })} />
                </Field>
                <Field label="Email" required hint="Your confirmation is sent here">
                  <Input type="email" autoComplete="email" value={g.email} onChange={(e) => setGuest({ ...g, email: e.target.value })} />
                </Field>
                <Field label="Mobile number" required>
                  <Input type="tel" autoComplete="tel" value={g.phone} onChange={(e) => setGuest({ ...g, phone: e.target.value })} />
                </Field>
                <Field label="Special requests" hint="Optional — subject to availability" className="sm:col-span-2">
                  <Textarea value={requests} maxLength={500} onChange={(e) => setRequests(e.target.value)} placeholder="Early check-in, extra pillows, dietary needs…" />
                </Field>
              </fieldset>
            )}
          </Step>

          <Step n={3} title="Review & policies">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-ink">Cancellation policy</h3>
                <div className="mt-2">
                  <PolicyRules policy={policy} />
                </div>
              </div>
              <div className="rounded-lg bg-surface-2 p-3 text-sm text-ink-2">
                <p className="font-medium text-ink">Payment conditions</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  <li>Full prepayment is required to confirm this booking.</li>
                  <li>Rooms are held for 15 minutes while you pay.</li>
                  <li>Refunds (if eligible) go back to the original payment method within 5–7 working days.</li>
                </ul>
              </div>
              {quote?.terms && (
                <details className="rounded-lg border border-line p-3 text-sm">
                  <summary className="cursor-pointer font-medium text-ink">Property terms &amp; conditions</summary>
                  <p className="mt-2 whitespace-pre-line text-ink-2">{quote.terms}</p>
                </details>
              )}
              <Checkbox
                disabled={locked}
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                label={
                  <span>
                    I agree to the cancellation policy, property rules and BookMeStays{" "}
                    <Link href="/terms" target="_blank" className="text-brand underline">
                      terms
                    </Link>
                    .
                  </span>
                }
              />
            </div>
          </Step>

          <Step n={4} title="Payment">
            {stage === "form" && (
              <div className="space-y-3">
                {formError && (
                  <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {formError}
                  </p>
                )}
                <Button type="submit" variant="accent" size="lg" className="w-full sm:w-auto" loading={busy} disabled={!quote || quoteLoading || status === "loading"}>
                  <Lock className="size-4" aria-hidden />
                  {quote ? `Pay ${formatINR(quote.totalAmount)} securely` : "Pay securely"}
                </Button>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <ShieldCheck className="size-3.5 text-success" aria-hidden /> Payments are processed securely by Razorpay (UPI, cards, net banking, wallets).
                </p>
              </div>
            )}

            {stage !== "form" && booking && order && (
              <div className="space-y-4">
                {stage !== "expired" && !holdExpired && <HoldTimer expiresAt={order.holdExpiresAt} />}
                <p className="text-sm text-ink-2">
                  Booking reference <span className="font-mono font-semibold text-ink">{booking.code}</span>
                </p>

                {(stage === "expired" || holdExpired) && (
                  <div role="alert" className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm">
                    <p className="font-semibold text-danger">Your room hold has expired</p>
                    <p className="mt-1 text-ink-2">No payment was taken. Rooms may still be available — please start again.</p>
                    <Link href={backHref} className={buttonClass("primary", "md", "mt-3")}>
                      Choose rooms again
                    </Link>
                  </div>
                )}

                {stage === "paying" && !holdExpired && isMockPayment(order) && (
                  <div className="rounded-xl border border-dashed border-warning bg-warning/5 p-4">
                    <p className="text-sm font-semibold text-ink">Development payment mode</p>
                    <p className="mt-1 text-sm text-ink-2">Razorpay keys aren&apos;t configured, so payments are simulated.</p>
                    <Button className="mt-3" onClick={simulate} loading={busy}>
                      <CreditCard className="size-4" aria-hidden /> Simulate successful payment (dev)
                    </Button>
                  </div>
                )}

                {stage === "paying" && !holdExpired && !isMockPayment(order) && (
                  <p className="text-sm text-muted">Complete the payment in the Razorpay window…</p>
                )}

                {stage === "failed" && !holdExpired && (
                  <div role="alert" className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm">
                    <p className="font-semibold text-danger">Payment not completed</p>
                    <p className="mt-1 text-ink-2">{payError}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button onClick={retry} loading={busy}>
                        Try payment again
                      </Button>
                      <Link href="/help#booking-support" className={buttonClass("outline")}>
                        Get help
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Step>
        </form>
      </div>

      <aside aria-label="Price summary" className="lg:sticky lg:top-4 lg:self-start">
        <Card className="overflow-hidden">
          <div className="flex gap-3 border-b border-line p-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              <SmartImage src={property.coverImageUrl} alt={property.name} fill sizes="80px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-ink">{property.name}</p>
              <p className="text-xs text-muted">{property.location}</p>
              <p className="mt-1 text-xs text-ink-2">
                {formatDate(checkIn, { day: "numeric", month: "short" })} – {formatDate(checkOut, { day: "numeric", month: "short" })}
                {quote ? ` · ${quote.nights} night${quote.nights === 1 ? "" : "s"}` : ""}
              </p>
            </div>
          </div>
          <div className="space-y-2 p-4 text-sm">
            {quoteLoading && !quote && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            )}
            {quoteError && !quote && (
              <div role="alert" className="space-y-2">
                <p className="text-danger">{quoteError}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setQuoteAttempt((a) => a + 1)}>
                    Retry
                  </Button>
                  <Link href={backHref} className={buttonClass("ghost", "sm")}>
                    Change selection
                  </Link>
                </div>
              </div>
            )}
            {quote && (
              <div className={cn("space-y-2", quoteLoading && "opacity-60")}>
                {quote.lines.map((l) => (
                  <div key={l.ratePlanId} className="flex justify-between gap-3">
                    <span className="text-ink-2">
                      {l.quantity} × {l.roomTypeName}
                      <span className="block text-xs text-muted">
                        {l.ratePlanName} · {quote.nights} night{quote.nights === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="text-ink">{formatINR(l.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-3 text-ink-2">
                  <span>Taxes (GST)</span>
                  <span>{formatINR(quote.roomTax)}</span>
                </div>
                {quote.addonsAmount > 0 && (
                  <div className="flex justify-between gap-3 text-ink-2">
                    <span>Add-ons</span>
                    <span>{formatINR(quote.addonsAmount)}</span>
                  </div>
                )}
                {quote.discountAmount > 0 && (
                  <div className="flex justify-between gap-3 text-success">
                    <span>Discount{quote.coupon ? ` (${quote.coupon.code})` : ""}</span>
                    <span>− {formatINR(quote.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3 border-t border-line pt-3 text-base font-bold text-ink">
                  <span>Total payable</span>
                  <span>{formatINR(quote.totalAmount)}</span>
                </div>
                <p className="text-xs text-muted">Includes all taxes. No hidden fees.</p>
              </div>
            )}

            {!locked && (
              <form
                className="border-t border-line pt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setCoupon(couponDraft.trim().toUpperCase() || undefined);
                }}
              >
                <label htmlFor="coupon" className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <BadgePercent className="size-3.5" aria-hidden /> Have a coupon?
                </label>
                <div className="mt-1.5 flex gap-2">
                  <Input id="coupon" value={couponDraft} onChange={(e) => setCouponDraft(e.target.value)} placeholder="Enter code" className="h-9 uppercase" />
                  {quote?.coupon ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9"
                      onClick={() => {
                        setCoupon(undefined);
                        setCouponDraft("");
                      }}
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button type="submit" size="sm" variant="outline" className="h-9" disabled={!couponDraft.trim()}>
                      Apply
                    </Button>
                  )}
                </div>
                {quote?.couponError && coupon && <p className="mt-1 text-xs text-danger">{quote.couponError}</p>}
                {quote?.coupon && <p className="mt-1 text-xs text-success">Coupon applied — you save {formatINR(quote.coupon.discount)}</p>}
              </form>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}
