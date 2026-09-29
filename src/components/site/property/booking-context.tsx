"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { track } from "@/lib/analytics";
import { filtersToQuery, nightsBetween } from "@/lib/search-params";
import type { AvailabilityResponse, RatePlanAvailability } from "@/lib/types";
import { useAuth } from "../auth-context";
import { encodeSelections, type Selection } from "../booking/selections";

export type { Selection };

export type StayState = { checkIn: string; checkOut: string; adults: number; children: number; rooms: number };

type Line = Selection & { roomTypeName: string; plan: RatePlanAvailability; maxOccupancy: number };

type Ctx = {
  slug: string;
  propertyId: string;
  propertyName: string;
  stay: StayState;
  setStay: (patch: Partial<StayState>) => void;
  hasDates: boolean;
  nights: number;
  availability: AvailabilityResponse | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  selections: Record<string, Selection>; // by ratePlanId
  setQuantity: (roomTypeId: string, ratePlanId: string, qty: number) => void;
  lines: Line[];
  totals: { rooms: number; amount: number; taxes: number; capacity: number };
  reserve: () => Promise<void>;
  reserving: boolean;
};

const BookingCtx = createContext<Ctx | null>(null);
export const useBooking = () => {
  const c = use(BookingCtx);
  if (!c) throw new Error("useBooking must be used inside <BookingProvider>");
  return c;
};

export function BookingProvider({
  slug,
  propertyId,
  propertyName,
  initial,
  children,
}: {
  slug: string;
  propertyId: string;
  propertyName: string;
  initial: StayState;
  children: ReactNode;
}) {
  const router = useRouter();
  const { requireAuth } = useAuth();
  const [stay, setStayState] = useState<StayState>(initial);
  const [result, setResult] = useState<{ key: string; data: AvailabilityResponse | null; error: string | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [reserving, setReserving] = useState(false);

  const hasDates = !!stay.checkIn && !!stay.checkOut && stay.checkOut > stay.checkIn;
  const key = hasDates ? `${stay.checkIn}|${stay.checkOut}|${stay.adults}|${stay.children}|${stay.rooms}|${attempt}` : "";

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    api<AvailabilityResponse>(`/public/properties/${slug}/availability`, {
      query: { checkIn: stay.checkIn, checkOut: stay.checkOut, adults: stay.adults, children: stay.children, rooms: stay.rooms },
    })
      .then((data) => !cancelled && setResult({ key, data, error: null }))
      .catch((e) => {
        if (cancelled) return;
        const msg =
          e instanceof ApiError && e.status < 500 ? e.message : "We couldn't check availability right now. Please try again.";
        setResult({ key, data: null, error: msg });
      });
    return () => {
      cancelled = true;
    };
    // stay fields are all encoded in `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, slug]);

  // Keep the URL in sync (shareable / survives refresh) without a server round-trip.
  useEffect(() => {
    const q = filtersToQuery(hasDates ? { ...stay } : { adults: stay.adults, children: stay.children, rooms: stay.rooms });
    const url = `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(null, "", url);
  }, [stay, hasDates]);

  const current = result && result.key === key ? result : null;
  const availability = hasDates ? (current?.data ?? null) : null;
  const loading = hasDates && !current;
  const error = hasDates ? (current?.error ?? null) : null;

  // Only selections that are still bookable for the current availability count.
  const lines = useMemo<Line[]>(() => {
    if (!availability) return [];
    const out: Line[] = [];
    for (const rt of availability.roomTypes) {
      for (const plan of rt.ratePlans) {
        const sel = selections[plan.ratePlanId];
        if (!sel || !plan.bookable || plan.available < 1) continue;
        out.push({ ...sel, quantity: Math.min(sel.quantity, plan.available), roomTypeName: rt.name, plan, maxOccupancy: rt.maxOccupancy });
      }
    }
    return out;
  }, [availability, selections]);

  const totals = useMemo(
    () =>
      lines.reduce(
        (t, l) => ({
          rooms: t.rooms + l.quantity,
          amount: t.amount + l.plan.totalPrice * l.quantity,
          taxes: t.taxes + l.plan.taxesPerRoom * l.quantity,
          capacity: t.capacity + l.maxOccupancy * l.quantity,
        }),
        { rooms: 0, amount: 0, taxes: 0, capacity: 0 },
      ),
    [lines],
  );

  const setStay = (patch: Partial<StayState>) => setStayState((s) => ({ ...s, ...patch }));

  const setQuantity = (roomTypeId: string, ratePlanId: string, qty: number) => {
    setSelections((s) => {
      const next = { ...s };
      if (qty <= 0) delete next[ratePlanId];
      else next[ratePlanId] = { roomTypeId, ratePlanId, quantity: qty };
      return next;
    });
    if (qty > 0) track("room_selected", { propertyId, roomTypeId, ratePlanId, quantity: qty });
  };

  const reserve = async () => {
    if (!lines.length || !hasDates) return;
    setReserving(true);
    try {
      const user = await requireAuth("Sign in to continue your booking. Your room selection is saved.");
      if (!user) return;
      track("booking_started", { propertyId, nights: nightsBetween(stay.checkIn, stay.checkOut), rooms: totals.rooms, amount: totals.amount });
      const q = new URLSearchParams({
        property: slug,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        adults: String(stay.adults),
        children: String(stay.children),
        sel: encodeSelections(lines),
      });
      router.push(`/checkout?${q.toString()}`);
    } finally {
      setReserving(false);
    }
  };

  const value: Ctx = {
    slug,
    propertyId,
    propertyName,
    stay,
    setStay,
    hasDates,
    nights: hasDates ? nightsBetween(stay.checkIn, stay.checkOut) : 0,
    availability,
    loading,
    error,
    retry: () => setAttempt((a) => a + 1),
    selections,
    setQuantity,
    lines,
    totals,
    reserve,
    reserving,
  };
  return <BookingCtx value={value}>{children}</BookingCtx>;
}
