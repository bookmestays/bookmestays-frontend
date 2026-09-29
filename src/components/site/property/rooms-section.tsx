"use client";

import { BedDouble, Check, Eye, Maximize, PlayCircle, RefreshCw, Users, Utensils, X } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import { MEAL_PLAN_LABELS, type CancellationPolicy, type Media, type RatePlanAvailability, type RoomType } from "@/lib/types";
import { SmartImage } from "../media/smart-image";
import { useBooking } from "./booking-context";
import { StayControls } from "./booking-widget";
import { MediaLightbox } from "./gallery";

export function policySummary(p: CancellationPolicy | null | undefined, refundable = true) {
  if (!refundable) return "Non-refundable";
  if (!p) return "Cancellation as per property policy";
  return p.summary;
}

function openCheckInPicker() {
  const el = document.getElementById("rooms-in") as HTMLInputElement | null;
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus();
  try {
    el.showPicker?.();
  } catch {
    // not supported / needs user activation
  }
}

function RoomFacts({ rt }: { rt: RoomType }) {
  const facts = [
    { Icon: Users, text: `Sleeps ${rt.maxOccupancy} (${rt.maxAdults} adult${rt.maxAdults === 1 ? "" : "s"}${rt.maxChildren ? `, ${rt.maxChildren} child${rt.maxChildren === 1 ? "" : "ren"}` : ""})` },
    rt.bedConfig ? { Icon: BedDouble, text: rt.bedConfig } : null,
    rt.sizeSqft ? { Icon: Maximize, text: `${rt.sizeSqft} sq ft` } : null,
    rt.viewType ? { Icon: Eye, text: rt.viewType } : null,
  ].filter(Boolean) as { Icon: typeof Users; text: string }[];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-2">
      {facts.map(({ Icon, text }) => (
        <li key={text} className="inline-flex items-center gap-1.5">
          <Icon className="size-4 text-muted" aria-hidden /> {text}
        </li>
      ))}
    </ul>
  );
}

function QuantitySelect({ max, value, onChange, label }: { max: number; value: number; onChange: (n: number) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 rounded-lg border border-line bg-white px-2 text-sm font-medium focus:border-brand focus:outline-none"
      >
        {Array.from({ length: Math.min(max, 10) + 1 }, (_, i) => (
          <option key={i} value={i}>
            {i === 0 ? "0 rooms" : `${i} room${i === 1 ? "" : "s"}`}
          </option>
        ))}
      </select>
    </label>
  );
}

function RatePlanRow({ roomTypeId, roomName, plan, nights }: { roomTypeId: string; roomName: string; plan: RatePlanAvailability; nights: number }) {
  const { selections, setQuantity } = useBooking();
  const qty = selections[plan.ratePlanId]?.quantity ?? 0;
  const soldOut = !plan.bookable || plan.available < 1;
  return (
    <li className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between", qty > 0 && "bg-brand-soft/40")}>
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-ink">{plan.name}</p>
        <p className="flex items-center gap-1.5 text-sm text-ink-2">
          <Utensils className="size-3.5 text-muted" aria-hidden /> {MEAL_PLAN_LABELS[plan.mealPlan]}
        </p>
        {plan.inclusions.length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-2">
            {plan.inclusions.map((inc) => (
              <li key={inc} className="inline-flex items-center gap-1">
                <Check className="size-3 text-success" aria-hidden /> {inc}
              </li>
            ))}
          </ul>
        )}
        <p className={cn("inline-flex items-center gap-1 text-xs font-medium", plan.isRefundable ? "text-success" : "text-warning")}>
          {plan.isRefundable ? <RefreshCw className="size-3" aria-hidden /> : <X className="size-3" aria-hidden />}
          {policySummary(plan.cancellationPolicy, plan.isRefundable)}
        </p>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1.5">
        <div className="sm:text-right">
          <p className="text-lg font-bold text-ink">
            {formatINR(plan.avgNightly)}
            <span className="text-xs font-normal text-muted"> /night</span>
          </p>
          <p className="text-xs text-muted">
            {formatINR(plan.totalPrice)} for {nights} night{nights === 1 ? "" : "s"} + {formatINR(plan.taxesPerRoom)} taxes
          </p>
          {!soldOut && plan.available <= 3 && <p className="text-xs font-medium text-danger">Only {plan.available} left</p>}
        </div>
        {soldOut ? (
          <Badge tone="danger">{plan.reason ?? "Sold out"}</Badge>
        ) : qty > 0 ? (
          <QuantitySelect label={`Rooms of ${roomName}, ${plan.name}`} max={plan.available} value={qty} onChange={(n) => setQuantity(roomTypeId, plan.ratePlanId, n)} />
        ) : (
          <Button size="sm" onClick={() => setQuantity(roomTypeId, plan.ratePlanId, 1)}>
            Select
          </Button>
        )}
      </div>
    </li>
  );
}

function RoomCard({ rt }: { rt: RoomType }) {
  const b = useBooking();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const avail = b.availability?.roomTypes.find((r) => r.id === rt.id);
  const media: Media[] = rt.media;
  const cover = media.find((m) => m.kind === "IMAGE") ?? null;
  const hasVideo = media.some((m) => m.kind === "VIDEO");
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const amenities = showAllAmenities ? rt.amenities : rt.amenities.slice(0, 6);
  const minBase = rt.ratePlans.filter((p) => p.isActive).reduce<number | null>((m, p) => (m == null || p.basePrice < m ? p.basePrice : m), null) ?? rt.basePrice;

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white" aria-labelledby={`room-${rt.id}`}>
      <div className="grid gap-4 p-4 sm:grid-cols-[240px_minmax(0,1fr)]">
        <button
          type="button"
          onClick={() => media.length && setLightbox(0)}
          className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-2 text-left"
          aria-label={media.length ? `View ${media.length} photos and videos of ${rt.name}` : rt.name}
        >
          <SmartImage src={cover?.url ?? media[0]?.posterUrl} alt={rt.name} fill sizes="(max-width: 640px) 100vw, 240px" className="object-cover" />
          {media.length > 1 && (
            <span className="absolute right-2 bottom-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">{media.length} photos</span>
          )}
          {hasVideo && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
              <PlayCircle className="size-3.5" aria-hidden /> Walkthrough
            </span>
          )}
        </button>
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 id={`room-${rt.id}`} className="text-lg font-semibold text-ink">
              {rt.name}
            </h3>
            {avail && avail.available > 0 && avail.available <= 3 && <Badge tone="warning">{avail.available} left</Badge>}
          </div>
          <RoomFacts rt={rt} />
          {rt.description && <p className="line-clamp-3 text-sm text-muted">{rt.description}</p>}
          {rt.amenities.length > 0 && (
            <div>
              <ul className="flex flex-wrap gap-1.5">
                {amenities.map((a) => (
                  <li key={a.id} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-2">
                    {a.name}
                  </li>
                ))}
              </ul>
              {rt.amenities.length > 6 && (
                <button type="button" onClick={() => setShowAllAmenities((s) => !s)} className="mt-1.5 text-xs font-medium text-brand hover:underline">
                  {showAllAmenities ? "Show fewer" : `+${rt.amenities.length - 6} more amenities`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-line">
        {!b.hasDates ? (
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold text-ink">
                <span className="text-xs font-normal text-muted">From </span>
                {formatINR(minBase)}
                <span className="text-xs font-normal text-muted"> /night</span>
              </p>
              <p className="text-xs text-muted">
                {rt.ratePlans.filter((p) => p.isActive).length || 1} rate option{rt.ratePlans.length === 1 ? "" : "s"} · Add dates for exact prices
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={openCheckInPicker}>
              Select dates
            </Button>
          </div>
        ) : b.loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : !avail ? (
          <p className="p-4 text-sm text-muted">Not available for the selected dates and guests.</p>
        ) : avail.ratePlans.length === 0 ? (
          <p className="p-4 text-sm text-muted">No rates available for these dates.</p>
        ) : (
          <ul className="divide-y divide-line">
            {avail.ratePlans.map((plan) => (
              <RatePlanRow key={plan.ratePlanId} roomTypeId={rt.id} roomName={rt.name} plan={plan} nights={b.nights} />
            ))}
          </ul>
        )}
      </div>
      {lightbox !== null && <MediaLightbox media={media} startIndex={lightbox} title={rt.name} onClose={() => setLightbox(null)} />}
    </article>
  );
}

export function RoomsSection({ roomTypes }: { roomTypes: RoomType[] }) {
  const b = useBooking();
  const allSoldOut =
    b.availability && b.availability.roomTypes.every((r) => r.ratePlans.every((p) => !p.bookable || p.available < 1));
  const sorted = [...roomTypes].sort((a, b2) => a.sort - b2.sort);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-2 p-3 sm:p-4">
        <p className="mb-2 text-sm font-medium text-ink">Your stay</p>
        <StayControls idPrefix="rooms" className="bg-white" />
      </div>
      {b.error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {b.error}
          <Button size="sm" variant="outline" onClick={b.retry}>
            Try again
          </Button>
        </div>
      )}
      {allSoldOut && (
        <div role="status" className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink-2">
          <strong className="text-ink">Sold out for these dates.</strong> Try different dates or fewer rooms — availability changes often.
        </div>
      )}
      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Room details are coming soon for this property.</p>
      ) : (
        sorted.map((rt) => <RoomCard key={rt.id} rt={rt} />)
      )}
    </div>
  );
}
