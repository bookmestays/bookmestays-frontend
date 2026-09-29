"use client";

import Link from "next/link";
import { AlertTriangle, BadgeCheck, Building2, CalendarCheck, Handshake, IndianRupee, Percent, Wallet } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { formatINR } from "@/lib/format";
import { CHANNEL_PROVIDER_LABELS, type AdminDashboard } from "@/lib/types";
import { Card, ErrorState, Skeleton } from "@/components/ui";
import { PageHeader, Section, StatCard } from "@/components/panel/page";
import { BarChart } from "@/components/panel/bar-chart";
import { DataTable } from "@/components/panel/data-table";
import { bookingColumns } from "@/components/panel/booking-parts";
import { cn } from "@/lib/cn";

export default function AdminDashboardPage() {
  const { data, error, loading, refetch } = useApi<AdminDashboard>("/admin/dashboard");

  if (error && !data) return <ErrorState message={error.message} onRetry={refetch} />;

  const t = data?.totals;
  const pa = data?.pendingApprovals;
  const pendingTotal = pa ? pa.properties + pa.roomTypes + pa.kyc + pa.reviews : 0;

  return (
    <>
      <PageHeader title="Dashboard" description="Platform overview for today and this month." />
      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        t && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="GMV today" value={formatINR(t.gmvToday)} icon={<IndianRupee />} tone="brand" hint={`${t.bookingsToday} booking${t.bookingsToday === 1 ? "" : "s"}`} />
            <StatCard label="GMV this month" value={formatINR(t.gmvMonth)} icon={<IndianRupee />} hint={`${t.bookingsMonth} bookings`} />
            <StatCard label="Commission (month)" value={formatINR(t.commissionMonth)} icon={<Percent />} />
            <StatCard label="Pending payouts" value={formatINR(t.pendingPayouts)} icon={<Wallet />} tone="warning" hint={<Link href="/admin/settlements?status=PENDING" className="text-brand hover:underline">Review settlements</Link>} />
            <StatCard label="Bookings today" value={t.bookingsToday} icon={<CalendarCheck />} />
            <StatCard label="Bookings this month" value={t.bookingsMonth} icon={<CalendarCheck />} />
            <StatCard label="Live partners" value={t.livePartners} icon={<Handshake />} />
            <StatCard label="Live properties" value={t.liveProperties} icon={<Building2 />} />
          </div>
        )
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Last 30 days" description="Gross booking value per day" className="lg:col-span-2">
          {data ? (
            <BarChart
              label="Daily gross booking value, last 30 days"
              data={data.dailyGmv.map((d) => ({ date: d.date, value: d.gmv, secondary: d.bookings }))}
              format={(v) => formatINR(v)}
              secondary={(n) => `${n} booking${n === 1 ? "" : "s"}`}
            />
          ) : (
            <Skeleton className="h-48" />
          )}
        </Section>
        <Section
          title="Pending approvals"
          actions={
            <Link href="/admin/approvals" className="text-sm text-brand hover:underline">
              Open queue
            </Link>
          }
        >
          {pa ? (
            <ul className="divide-y divide-line text-sm">
              {[
                { label: "Properties awaiting review", n: pa.properties, href: "/admin/approvals?tab=properties" },
                { label: "Room types awaiting approval", n: pa.roomTypes, href: "/admin/approvals?tab=room-types" },
                { label: "KYC submissions", n: pa.kyc, href: "/admin/approvals?tab=kyc" },
                { label: "Reviews to moderate", n: pa.reviews, href: "/admin/approvals?tab=reviews" },
              ].map((r) => (
                <li key={r.label}>
                  <Link href={r.href} className="flex items-center justify-between py-2.5 hover:text-brand">
                    <span className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-muted" /> {r.label}
                    </span>
                    <span className={cn("rounded-full px-2 text-xs leading-5 font-semibold", r.n ? "bg-warning/15 text-warning" : "bg-surface-2 text-muted")}>{r.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Skeleton className="h-40" />
          )}
          {pa && pendingTotal === 0 && <p className="mt-2 text-xs text-muted">All caught up.</p>}
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Recent bookings</h2>
            <Link href="/admin/bookings" className="text-sm text-brand hover:underline">
              View all
            </Link>
          </div>
          <DataTable
            columns={bookingColumns()}
            rows={data?.recentBookings}
            rowKey={(b) => b.id}
            loading={loading}
            rowHref={(b) => `/admin/bookings/${b.id}`}
            dense
            empty={{ title: "No bookings yet" }}
          />
        </div>
        <Section
          title="Channel health"
          actions={
            <Link href="/admin/channel-managers" className="text-sm text-brand hover:underline">
              Details
            </Link>
          }
        >
          {!data ? (
            <Skeleton className="h-32" />
          ) : data.channelHealth.length === 0 ? (
            <p className="text-sm text-muted">No channel manager connections yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.channelHealth.map((c) => (
                <li key={c.provider}>
                  <Card className="flex items-center justify-between gap-2 p-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{CHANNEL_PROVIDER_LABELS[c.provider]}</p>
                      <p className="text-xs text-muted">{c.active} active connection{c.active === 1 ? "" : "s"}</p>
                    </div>
                    {c.errors24h > 0 ? (
                      <Link href={`/admin/channel-managers?tab=logs&status=FAILED`} className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline">
                        <AlertTriangle className="size-3.5" /> {c.errors24h} error{c.errors24h === 1 ? "" : "s"} (24h)
                      </Link>
                    ) : (
                      <span className="text-xs font-medium text-success">Healthy</span>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
