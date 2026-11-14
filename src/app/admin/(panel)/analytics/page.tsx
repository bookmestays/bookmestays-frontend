"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Eye, IndianRupee, ShoppingCart, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApi } from "@/lib/use-api";
import { formatDate, formatINR } from "@/lib/format";
import type { SiteAnalytics } from "@/lib/types";
import { PageHeader, Section, StatCard } from "@/components/panel/page";
import { DataTable } from "@/components/panel/data-table";
import { BarChart } from "@/components/panel/bar-chart";
import { FiltersBar, DateFilter } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";
import { ErrorState, Skeleton } from "@/components/ui";

const int = (n: number) => n.toLocaleString("en-IN");
const pct = (r: number) => `${(r * 100).toFixed(r > 0 && r < 0.1 ? 1 : 0)}%`;

/** IST date `days` ago (inclusive range ends today). */
function istDate(daysAgo = 0) {
  return new Date(Date.now() + 5.5 * 3600_000 - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "7 days", days: 6 },
  { label: "30 days", days: 29 },
  { label: "90 days", days: 89 },
];

const DEVICE_LABEL: Record<string, string> = { mobile: "Mobile", tablet: "Tablet", desktop: "Desktop", unknown: "Unknown (older data)" };
const FAILURE_LABEL: Record<string, string> = { cancelled_by_guest: "Guest closed the payment window", failed: "Payment failed at Razorpay" };

function RangePresets() {
  const { get, set } = useUrlParams();
  const to = get("to") || istDate();
  const from = get("from");
  return (
    <div className="flex flex-col gap-1">
      <span className="mb-1 text-xs font-medium text-muted">Quick range</span>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => {
          const pFrom = istDate(p.days);
          const active = (from ? from === pFrom : p.days === 29) && to === istDate();
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => set({ from: pFrom, to: istDate() })}
              className={cn(
                "h-10 rounded-md border px-3 text-sm font-medium",
                active ? "border-brand bg-brand-soft text-brand" : "border-line bg-white text-ink hover:bg-surface-2",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Horizontal bar list: label · bar · value. */
function BarList({ rows, empty = "No data for this period." }: { rows: { key: string; label: ReactNode; value: number; hint?: ReactNode }[]; empty?: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">{r.label}</span>
            <span className="shrink-0 tabular-nums text-ink">
              {int(r.value)}
              {r.hint && <span className="ml-1.5 text-xs text-muted">{r.hint}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-brand-soft">
            <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Funnel({ steps }: { steps: SiteAnalytics["funnel"] }) {
  const top = Math.max(1, steps[0]?.visitors ?? 1);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const lost = i > 0 ? steps[i - 1].visitors - s.visitors : 0;
        return (
          <li key={s.key}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-medium text-ink">
                <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-brand-soft text-xs text-brand">{i + 1}</span>
                {s.label}
              </span>
              <span className="tabular-nums text-ink">
                <span className="font-semibold">{int(s.visitors)}</span>
                <span className="ml-1.5 text-xs text-muted">{pct(s.ofVisited)} of visitors</span>
              </span>
            </div>
            <div className="h-3 rounded-full bg-brand-soft">
              <div className="h-3 rounded-full bg-brand" style={{ width: `${Math.max(1, (s.visitors / top) * 100)}%` }} />
            </div>
            {i > 0 && lost > 0 && (
              <p className="mt-1 text-xs text-muted">
                <span className="text-danger">−{int(lost)}</span> dropped here · {pct(s.fromPrevious)} continued from the previous step
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function AdminAnalyticsPage() {
  const { query } = useUrlParams();
  const { data, error, loading, refetch } = useApi<SiteAnalytics>("/admin/analytics", query);
  const s = data?.summary;
  const issues = data?.issues;
  const issueCount = issues ? issues.jsErrors.length + issues.notFound.length + issues.paymentFailures.length + issues.bookingErrors.length : 0;

  return (
    <>
      <PageHeader
        title="Site analytics"
        description={
          data
            ? `Guest website activity from ${formatDate(data.range.from)} to ${formatDate(data.range.to)}. Bots are excluded.`
            : "Who visits the guest website, where they come from, what they look at and where they drop off."
        }
      />
      <FiltersBar>
        <RangePresets />
        <DateFilter label="Custom dates" />
      </FiltersBar>

      {error && !data && <ErrorState message={error.message} onRetry={refetch} />}
      {loading && !data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {data && s && (
        <div className={cn("space-y-4", loading && "opacity-60 transition-opacity")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Visitors" value={int(s.visitors)} hint={`${int(s.newVisitors)} new · ${int(s.returningVisitors)} returning`} icon={<Users />} tone="brand" />
            <StatCard label="Page views" value={int(s.pageViews)} hint={`${int(s.sessions)} visits · ${s.pagesPerSession.toFixed(1)} pages per visit`} icon={<Eye />} />
            <StatCard label="Bookings" value={int(s.bookings)} hint={`${pct(s.conversionRate)} of visitors booked`} icon={<ShoppingCart />} tone="brand" />
            <StatCard label="Booking value" value={formatINR(s.bookingRevenue)} hint={`${int(s.loggedInVisitors)} visitors were signed in`} icon={<IndianRupee />} />
          </div>

          <Section title="Daily visitors" description="Unique visitors per day. Hover a bar to see page views.">
            <BarChart
              data={data.daily.map((d) => ({ date: d.date, value: d.visitors, secondary: d.pageViews }))}
              format={(v) => `${int(v)} visitors`}
              secondary={(v) => `${int(v)} page views`}
              label="Daily unique visitors"
            />
          </Section>

          <Section
            title="Booking funnel"
            description={`How far visitors get towards a booking. ${int(s.searchers)} visitors (${pct(s.visitors ? s.searchers / s.visitors : 0)}) also used search.`}
          >
            <Funnel steps={data.funnel} />
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Where visitors come from" description="Traffic source of each visit (utm_source tag, else the referring site)." bodyClassName="p-0 sm:p-0">
              <DataTable
                className="rounded-none border-0"
                dense
                rows={data.sources}
                rowKey={(r) => r.source}
                empty={{ title: "No visits in this range" }}
                columns={[
                  { key: "source", header: "Source", cell: (r) => <span className="font-medium text-ink">{r.source}</span> },
                  { key: "visitors", header: "Visitors", cell: (r) => int(r.visitors), align: "right", sortValue: (r) => r.visitors },
                  { key: "sessions", header: "Visits", cell: (r) => int(r.sessions), align: "right", sortValue: (r) => r.sessions, hideBelow: "sm" },
                  { key: "bookings", header: "Bookings", cell: (r) => int(r.bookings), align: "right", sortValue: (r) => r.bookings },
                ]}
              />
            </Section>

            <Section title="Devices">
              <BarList
                rows={data.devices.map((d) => ({
                  key: d.device,
                  label: DEVICE_LABEL[d.device] ?? d.device,
                  value: d.visitors,
                  hint: s.visitors ? pct(d.visitors / s.visitors) : undefined,
                }))}
              />
            </Section>

            <Section title="Countries">
              <BarList rows={data.countries.map((c) => ({ key: c.country, label: c.country, value: c.visitors }))} />
            </Section>

            <Section title="Cities" description="Visitor city, when the hosting network provides it.">
              <BarList
                rows={data.cities.map((c) => ({
                  key: `${c.city}-${c.region}-${c.country}`,
                  label: [c.city, c.region].filter(Boolean).join(", "),
                  value: c.visitors,
                }))}
                empty="City data not available yet. Country and city are also in Google Analytics."
              />
            </Section>
          </div>

          <Section title="Most visited pages" bodyClassName="p-0 sm:p-0">
            <DataTable
              className="rounded-none border-0"
              dense
              rows={data.topPages}
              rowKey={(r) => r.path}
              empty={{ title: "No page views yet", description: "Page views are recorded from the moment this report went live." }}
              columns={[
                {
                  key: "page",
                  header: "Page",
                  cell: (r) => (
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{r.label}</p>
                      <p className="truncate text-xs text-muted">{r.path}</p>
                    </div>
                  ),
                },
                { key: "views", header: "Views", cell: (r) => int(r.views), align: "right", sortValue: (r) => r.views },
                { key: "visitors", header: "Visitors", cell: (r) => int(r.visitors), align: "right", sortValue: (r) => r.visitors },
              ]}
            />
          </Section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Section title="Properties" description="Views and bookings per stay: high views with few bookings is worth a look." bodyClassName="p-0 sm:p-0">
              <DataTable
                className="rounded-none border-0"
                dense
                rows={data.properties}
                rowKey={(r) => r.propertyId}
                empty={{ title: "No property views in this range" }}
                columns={[
                  {
                    key: "name",
                    header: "Property",
                    cell: (r) =>
                      r.slug ? (
                        <Link href={`/admin/properties/${r.propertyId}`} className="font-medium text-brand hover:underline">
                          {r.name}
                        </Link>
                      ) : (
                        <span className="text-muted">{r.name}</span>
                      ),
                  },
                  { key: "views", header: "Views", cell: (r) => int(r.views), align: "right", sortValue: (r) => r.views },
                  { key: "visitors", header: "Visitors", cell: (r) => int(r.visitors), align: "right", sortValue: (r) => r.visitors, hideBelow: "md" },
                  { key: "checkouts", header: "Clicked book", cell: (r) => int(r.checkouts), align: "right", sortValue: (r) => r.checkouts, hideBelow: "sm" },
                  { key: "bookings", header: "Bookings", cell: (r) => int(r.bookings), align: "right", sortValue: (r) => r.bookings },
                  {
                    key: "conv",
                    header: "Conversion",
                    cell: (r) => (r.visitors ? pct(Math.min(1, r.bookings / r.visitors)) : "—"),
                    align: "right",
                    sortValue: (r) => (r.visitors ? r.bookings / r.visitors : 0),
                  },
                ]}
              />
            </Section>

            <Section title="Top searches" description="Destinations and keywords guests searched for.">
              <BarList rows={data.searches.map((t) => ({ key: t.term, label: <span className="capitalize">{t.term}</span>, value: t.searches, hint: `${int(t.visitors)} ppl` }))} />
            </Section>
          </div>

          {issues && (
            <Section
              title={
                <span className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-warning" aria-hidden />
                  Problems guests ran into
                </span>
              }
              description="Fix these to stop losing guests. Empty lists are good news."
            >
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <StatCard label="Abandoned checkouts" value={int(issues.abandonedCheckouts)} hint="Reached checkout but didn't book" tone="warning" />
                <StatCard label="Payment problems" value={int(issues.paymentFailures.reduce((a, p) => a + p.visitors, 0))} hint="Visitors whose payment didn't go through" tone="warning" />
                <StatCard label="Errors & broken links" value={int(issues.jsErrors.reduce((a, e) => a + e.count, 0) + issues.notFound.reduce((a, n) => a + n.count, 0))} hint="Page errors and 404s" tone="warning" />
              </div>

              {issueCount === 0 ? (
                <p className="py-4 text-center text-sm text-muted">No errors, broken links or payment failures recorded in this range.</p>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  {issues.paymentFailures.length > 0 && (
                    <IssueList
                      title="Payment failures"
                      rows={issues.paymentFailures.map((p) => ({ key: p.reason, title: FAILURE_LABEL[p.reason] ?? p.reason, count: p.count, visitors: p.visitors }))}
                    />
                  )}
                  {issues.bookingErrors.length > 0 && (
                    <IssueList title="Booking could not be created" rows={issues.bookingErrors.map((b) => ({ key: b.message, title: b.message, count: b.count, visitors: b.visitors }))} />
                  )}
                  {issues.notFound.length > 0 && (
                    <IssueList
                      title="Broken links (page not found)"
                      rows={issues.notFound.map((n) => ({ key: n.path, title: <code className="text-xs">{n.path}</code>, count: n.count, visitors: n.visitors }))}
                    />
                  )}
                  {issues.jsErrors.length > 0 && (
                    <IssueList
                      title="Page errors"
                      rows={issues.jsErrors.map((e) => ({
                        key: e.message,
                        title: e.message,
                        sub: `${e.lastPath ?? ""} · last ${formatDate(e.lastSeen, { day: "numeric", month: "short" })}`,
                        count: e.count,
                        visitors: e.visitors,
                      }))}
                    />
                  )}
                </div>
              )}
            </Section>
          )}

          <p className="pb-2 text-xs text-muted">
            Page views, traffic sources, devices and locations are recorded from the day this report went live; older data only has booking events.
            Use links tagged like <code>bookmestays.in/?utm_source=instagram&amp;utm_campaign=diwali</code> in posts, ads and WhatsApp messages so they show up as their own source.
          </p>
        </div>
      )}
    </>
  );
}

function IssueList({ title, rows }: { title: string; rows: { key: string; title: ReactNode; sub?: string; count: number; visitors: number }[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink">{title}</h3>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {rows.map((r) => (
          <li key={r.key} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="break-words text-ink">{r.title}</p>
              {r.sub && <p className="truncate text-xs text-muted">{r.sub}</p>}
            </div>
            <span className="shrink-0 text-right tabular-nums">
              <span className="font-medium text-ink">{int(r.count)}×</span>
              <span className="block text-xs text-muted">{int(r.visitors)} visitors</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
