"use client";

import Link from "next/link";
import { BedDouble, CalendarCheck, IndianRupee, LogIn, LogOut, Percent, Wallet } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { formatDate, formatINR } from "@/lib/format";
import type { BookingSummary, PartnerDashboard } from "@/lib/types";
import { Card, ErrorState, Skeleton } from "@/components/ui";
import { Alert, PageHeader, Section, StatCard } from "@/components/panel/page";
import { BarChart } from "@/components/panel/bar-chart";
import { StatusBadge } from "@/components/panel/status-badge";
import { usePanelAuth } from "@/components/panel/auth";
import { guestsLabel } from "@/components/panel/booking-parts";

function GuestList({ items, empty, kind }: { items: BookingSummary[]; empty: string; kind: "in" | "out" }) {
  if (!items.length) return <p className="py-4 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((b) => (
        <li key={b.id}>
          <Link href={`/partner/bookings/${b.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:text-brand">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{b.guestName}</p>
              <p className="truncate text-xs text-muted">
                {b.roomsLabel} · {guestsLabel(b)} · {b.property.name}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <StatusBadge kind="booking" status={b.status} />
              <p className="mt-0.5 font-mono text-[11px] text-muted">{b.code}</p>
            </div>
          </Link>
          <span className="sr-only">{kind === "in" ? "arriving" : "departing"}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PartnerDashboardPage() {
  const { me } = usePanelAuth();
  const { data, error, loading, refetch } = useApi<PartnerDashboard>("/partner/dashboard");
  if (error && !data) return <ErrorState message={error.message} onRetry={refetch} />;
  const d = data;
  const drafts = d?.properties.filter((p) => p.status === "DRAFT" || p.status === "REJECTED") ?? [];
  return (
    <>
      <PageHeader title={`Welcome${me.user.name ? `, ${me.user.name.split(" ")[0]}` : ""}`} description={`Today is ${formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}.`} />
      {drafts.length > 0 && (
        <Alert tone="warning" className="mb-4" title="Finish setting up your property" action={<Link href={`/partner/properties/${drafts[0].id}`} className="text-sm font-medium text-brand hover:underline">Continue</Link>}>
          {drafts.length === 1 ? `${drafts[0].name} isn't live yet.` : `${drafts.length} properties aren't live yet.`} Complete the details and submit for review.
        </Alert>
      )}
      {!d ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Arrivals today" value={d.arrivalsToday.length} icon={<LogIn />} tone="brand" />
          <StatCard label="Departures today" value={d.departuresToday.length} icon={<LogOut />} />
          <StatCard label="In-house" value={d.inHouse} icon={<BedDouble />} hint={`${d.upcomingCount} upcoming`} />
          <StatCard label="Occupancy next 30 days" value={`${Math.round(d.occupancyNext30 * 100)}%`} icon={<Percent />} />
          <StatCard label="Revenue this month" value={formatINR(d.revenueMonth)} icon={<IndianRupee />} hint="Your payout basis" />
          <StatCard label="Bookings this month" value={d.bookingsMonth} icon={<CalendarCheck />} />
          <StatCard
            label="Next settlement"
            value={d.nextSettlement ? formatINR(d.nextSettlement.estimatedAmount) : "—"}
            icon={<Wallet />}
            hint={d.nextSettlement ? `Est. on ${formatDate(d.nextSettlement.scheduledFor)}` : "Nothing due yet"}
            tone="warning"
          />
          <StatCard label="Properties" value={d.properties.length} icon={<BedDouble />} hint={`${d.properties.filter((p) => p.status === "LIVE").length} live`} />
        </div>
      )}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Arriving today" actions={<Link href="/partner/bookings?tab=upcoming" className="text-sm text-brand hover:underline">All upcoming</Link>}>
          {loading && !d ? <Skeleton className="h-24" /> : <GuestList items={d?.arrivalsToday ?? []} empty="No arrivals today." kind="in" />}
        </Section>
        <Section title="Departing today" actions={<Link href="/partner/bookings?tab=in-house" className="text-sm text-brand hover:underline">In-house</Link>}>
          {loading && !d ? <Skeleton className="h-24" /> : <GuestList items={d?.departuresToday ?? []} empty="No departures today." kind="out" />}
        </Section>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Revenue, last 30 days" className="lg:col-span-2">
          {d ? (
            <BarChart
              label="Daily revenue, last 30 days"
              data={d.dailyRevenue.map((x) => ({ date: x.date, value: x.revenue, secondary: x.bookings }))}
              format={(v) => formatINR(v)}
              secondary={(n) => `${n} booking${n === 1 ? "" : "s"}`}
            />
          ) : (
            <Skeleton className="h-48" />
          )}
        </Section>
        <Section title="Your properties" actions={<Link href="/partner/properties" className="text-sm text-brand hover:underline">Manage</Link>}>
          {!d ? (
            <Skeleton className="h-32" />
          ) : d.properties.length === 0 ? (
            <p className="text-sm text-muted">No properties yet.</p>
          ) : (
            <ul className="space-y-2">
              {d.properties.map((p) => (
                <li key={p.id}>
                  <Link href={`/partner/properties/${p.id}`}>
                    <Card className="flex items-center justify-between gap-2 p-3 hover:border-brand">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                        <p className="text-xs text-muted">{p.cityName ?? "—"} · {p.roomTypeCount} room types</p>
                      </div>
                      <StatusBadge kind="property" status={p.status} />
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
