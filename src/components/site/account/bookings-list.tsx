"use client";

import { CalendarX2, ChevronRight, Luggage } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonClass, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatINR } from "@/lib/format";
import type { BookingSummary, Paginated } from "@/lib/types";
import { SmartImage } from "../media/smart-image";
import { BookingStatusBadge } from "./booking-status";

type Tab = "upcoming" | "past" | "cancelled";
const TABS: { id: Tab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

export function BookingsList() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [res, setRes] = useState<{ key: string; data: Paginated<BookingSummary> | null; error: boolean } | null>(null);
  const [items, setItems] = useState<{ key: string; list: BookingSummary[] }>({ key: "", list: [] });
  const key = `${tab}|${attempt}`;

  useEffect(() => {
    let cancelled = false;
    api<Paginated<BookingSummary>>("/bookings", { query: { tab, page } })
      .then((data) => {
        if (cancelled) return;
        setRes({ key: `${key}|${page}`, data, error: false });
        setItems((prev) => ({ key, list: page === 1 || prev.key !== key ? data.items : [...prev.list, ...data.items.filter((x) => !prev.list.some((y) => y.id === x.id))] }));
      })
      .catch(() => !cancelled && setRes({ key: `${key}|${page}`, data: null, error: true }));
    return () => {
      cancelled = true;
    };
  }, [tab, page, key]);

  const current = res?.key === `${key}|${page}` ? res : null;
  const list = items.key === key ? items.list : [];
  const loading = !current;

  const empty = {
    upcoming: { title: "No upcoming stays", body: "When you book a stay, it will show up here." },
    past: { title: "No past stays yet", body: "Completed stays appear here — you can review them too." },
    cancelled: { title: "No cancelled bookings", body: "Good news — nothing cancelled." },
  }[tab];

  return (
    <div>
      <div role="tablist" aria-label="Booking status" className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setPage(1);
            }}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium",
              tab === t.id ? "border-brand text-brand" : "border-transparent text-ink-2 hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {current?.error && list.length === 0 ? (
          <ErrorState message="We couldn't load your bookings." onRetry={() => setAttempt((a) => a + 1)} />
        ) : loading && list.length === 0 ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={tab === "cancelled" ? <CalendarX2 /> : <Luggage />}
            title={empty.title}
            description={empty.body}
            action={
              <Link href="/search" className={buttonClass("primary")}>
                Find your next stay
              </Link>
            }
            className="rounded-xl border border-dashed border-line"
          />
        ) : (
          <>
            <ul className="space-y-3">
              {list.map((b) => (
                <li key={b.id}>
                  <Link href={`/account/bookings/${b.code}`} className="group flex gap-4 rounded-xl border border-line bg-white p-3 transition-shadow hover:shadow-md">
                    <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:w-36">
                      <SmartImage src={b.property.coverImageUrl} alt={b.property.name} fill sizes="144px" className="object-cover" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold text-ink group-hover:underline">{b.property.name}</p>
                        <BookingStatusBadge status={b.status} />
                      </div>
                      <p className="text-sm text-ink-2">
                        {formatDate(b.checkIn, { day: "numeric", month: "short" })} – {formatDate(b.checkOut, { day: "numeric", month: "short", year: "numeric" })} · {b.nights} night{b.nights === 1 ? "" : "s"}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {b.roomsLabel} · {b.property.cityName ?? ""} · Ref {b.code}
                      </p>
                      <p className="mt-auto flex items-center justify-between text-sm">
                        <span className="font-semibold text-ink">{formatINR(b.totalAmount)}</span>
                        <ChevronRight className="size-4 text-muted" aria-hidden />
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {current?.data && page < current.data.totalPages && (
              <Button variant="outline" className="mt-4" onClick={() => setPage((p) => p + 1)} loading={loading}>
                Load more
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
