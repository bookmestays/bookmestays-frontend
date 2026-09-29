"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Field, Input, Modal, Skeleton, Textarea, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import type { BookingDetail, CancellationPolicy } from "@/lib/types";
import { PolicyRules } from "../property/property-sections";

type Preview = { refundAmount: number; cancellationFee: number; policy: CancellationPolicy | null; canCancel: boolean; reason?: string };

export function CancelBookingModal({
  booking,
  open,
  onClose,
  onCancelled,
}: {
  booking: BookingDetail;
  open: boolean;
  onClose: () => void;
  onCancelled: (b: BookingDetail) => void;
}) {
  const toast = useToast();
  const [preview, setPreview] = useState<{ code: string; data: Preview | null; error: string | null } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api<Preview>(`/bookings/${booking.code}/cancellation-preview`)
      .then((data) => !cancelled && setPreview({ code: booking.code, data, error: null }))
      .catch((e) => !cancelled && setPreview({ code: booking.code, data: null, error: e instanceof ApiError ? e.message : "Couldn't load the refund estimate." }));
    return () => {
      cancelled = true;
    };
  }, [open, booking.code]);

  const p = preview?.code === booking.code ? preview : null;

  const confirm = async () => {
    setBusy(true);
    try {
      const updated = await api<BookingDetail>(`/bookings/${booking.code}/cancel`, { method: "POST", body: { reason: reason.trim() || undefined } });
      track("booking_cancelled", { bookingCode: booking.code, refundAmount: p?.data?.refundAmount });
      toast.success("Your booking has been cancelled.");
      onCancelled(updated);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't cancel the booking. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancel booking"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep booking
          </Button>
          <Button variant="danger" onClick={confirm} loading={busy} disabled={!p?.data?.canCancel}>
            Cancel booking
          </Button>
        </>
      }
    >
      {!p ? (
        <div className="space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : p.error ? (
        <p role="alert" className="text-sm text-danger">
          {p.error}
        </p>
      ) : p.data && !p.data.canCancel ? (
        <p className="text-sm text-ink-2">{p.data.reason ?? "This booking can no longer be cancelled online. Please contact support."}</p>
      ) : p.data ? (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-success/10 p-3">
              <p className="text-xs text-muted">Refund</p>
              <p className="text-lg font-bold text-success">{formatINR(p.data.refundAmount)}</p>
            </div>
            <div className="rounded-lg bg-surface-2 p-3">
              <p className="text-xs text-muted">Cancellation fee</p>
              <p className="text-lg font-bold text-ink">{formatINR(p.data.cancellationFee)}</p>
            </div>
          </div>
          <PolicyRules policy={p.data.policy ?? booking.cancellationPolicy} />
          <p className="text-xs text-muted">Refunds go back to your original payment method within 5–7 working days.</p>
          <Field label="Reason (optional)">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Change of plans, found another stay…" />
          </Field>
        </div>
      ) : null}
    </Modal>
  );
}

export function ReviewModal({ bookingCode, propertyName, open, onClose, onDone }: { bookingCode: string; propertyName: string; open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!rating) return setError("Please choose a star rating.");
    setBusy(true);
    setError(null);
    try {
      await api("/reviews", { method: "POST", body: { bookingCode, rating, title: title.trim() || undefined, body: body.trim() || undefined } });
      toast.success("Thanks for your review!");
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't submit your review. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Review your stay at ${propertyName}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Later
          </Button>
          <Button onClick={submit} loading={busy}>
            Submit review
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <fieldset>
          <legend className="text-sm font-medium text-ink">Overall rating</legend>
          <div className="mt-2 flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                aria-pressed={rating === n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                className="rounded p-0.5"
              >
                <Star className={cn("size-8", n <= (hover || rating) ? "fill-rating text-rating" : "text-line")} aria-hidden />
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="Title">
          <Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Sum up your stay" />
        </Field>
        <Field label="Your review" error={error}>
          <Textarea value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} placeholder="What did you love? What could be better?" className="min-h-32" />
        </Field>
      </div>
    </Modal>
  );
}
