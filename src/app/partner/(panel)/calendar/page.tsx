"use client";

import { useState } from "react";
import { Cable, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import { formatDate, formatINR } from "@/lib/format";
import { CHANNEL_PROVIDER_LABELS, type CalendarResponse, type ChannelConnection, type PartnerPropertyRow } from "@/lib/types";
import { Button, Card, EmptyState, ErrorState, Field, Input, Modal, Select, Skeleton, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { Alert, PageHeader } from "@/components/panel/page";
import { DateRangePicker, MoneyInput, NumberInput } from "@/components/panel/inputs";
import { useUrlParams } from "@/components/panel/url-state";
import { WEEKDAYS_SHORT } from "@/components/panel/labels";
import { addDays, todayISO } from "@/components/panel/util";
import { RequirePermission } from "../../_components/require";

type Target = { kind: "inventory"; roomTypeId: string } | { kind: "rates"; ratePlanId: string };
type Tri = "" | "true" | "false";
const tri = (v: Tri) => (v === "" ? undefined : v === "true");

export default function CalendarPage() {
  return (
    <RequirePermission perm="inventory">
      <Calendar />
    </RequirePermission>
  );
}

function Calendar() {
  const { get, set } = useUrlParams();
  const [today] = useState(todayISO);
  const props = useApi<PartnerPropertyRow[]>("/partner/properties");
  const list = props.data?.filter((p) => p.roomTypeCount > 0) ?? [];
  const propertyId = get("property") || list[0]?.id || "";
  const days = get("days") === "30" ? 30 : 14;
  const from = get("from") || today;
  const to = addDays(from, days - 1);
  const cal = useApi<CalendarResponse>(propertyId ? `/partner/properties/${propertyId}/calendar` : null, { from, to });
  const conn = useApi<unknown>(propertyId && cal.data?.channelManaged ? `/partner/properties/${propertyId}/channel` : null);
  const provider = (() => {
    const d = conn.data as { connection?: ChannelConnection; provider?: ChannelConnection["provider"] } | null | undefined;
    const p = d?.connection?.provider ?? d?.provider;
    return p ? CHANNEL_PROVIDER_LABELS[p] : "your channel manager";
  })();
  const [bulk, setBulk] = useState<{ target: Target | null; from: string; to: string } | null>(null);
  const data = cal.data?.from === from ? cal.data : undefined;
  const readOnly = !!data?.channelManaged;
  const dates = Array.from({ length: days }, (_, i) => addDays(from, i));

  const open = (target: Target | null, date?: string) => !readOnly && setBulk({ target, from: date ?? from, to: date ?? to });

  return (
    <>
      <PageHeader
        title="Rates & availability"
        description="Rooms to sell, prices and restrictions per night."
        actions={
          <Button onClick={() => open(null)} disabled={!data || readOnly}>
            <SlidersHorizontal className="size-4" /> Bulk update
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex w-full flex-col gap-1 sm:w-64">
          <span className="text-xs font-medium text-muted">Property</span>
          <Select value={propertyId} onChange={(e) => set({ property: e.target.value })} disabled={!list.length}>
            {list.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Start</span>
          <Input type="date" value={from} onChange={(e) => e.target.value && set({ from: e.target.value })} className="w-40" />
        </label>
        <div className="flex items-center gap-1">
          <Button variant="outline" aria-label="Previous period" onClick={() => set({ from: addDays(from, -days) })}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => set({ from: null })}>
            Today
          </Button>
          <Button variant="outline" aria-label="Next period" onClick={() => set({ from: addDays(from, days) })}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div role="group" aria-label="Days shown" className="flex overflow-hidden rounded-lg border border-line">
          {[14, 30].map((d) => (
            <button key={d} type="button" aria-pressed={days === d} onClick={() => set({ days: d === 14 ? null : d })} className={cn("h-10 px-3 text-sm", days === d ? "bg-ink text-white" : "bg-white text-ink hover:bg-surface-2")}>
              {d} days
            </button>
          ))}
        </div>
      </div>

      {readOnly && (
        <Alert tone="info" className="mb-4" title={`Managed by ${provider}`}>
          <span className="inline-flex items-center gap-1">
            <Cable className="size-4" /> Update rates and availability in your channel manager — changes sync here automatically.
          </span>
        </Alert>
      )}

      {props.error && !props.data ? (
        <ErrorState message={props.error.message} onRetry={props.refetch} />
      ) : props.data && !list.length ? (
        <Card>
          <EmptyState title="No rooms to manage yet" description="Add room types and rate plans to a property first." />
        </Card>
      ) : cal.error && !data ? (
        <ErrorState message={cal.error.message} onRetry={cal.refetch} />
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-max min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-surface-2/60">
                  <th scope="col" className="sticky left-0 z-10 min-w-44 border-r border-b border-line bg-surface-2 px-3 py-2 text-left font-semibold text-muted">
                    {formatDate(from, { month: "short", year: "numeric" })}
                  </th>
                  {dates.map((d) => {
                    const dow = new Date(`${d}T00:00:00`).getDay();
                    return (
                      <th key={d} scope="col" className={cn("min-w-16 border-b border-l border-line px-1 py-1.5 text-center font-medium", (dow === 0 || dow === 6) && "bg-brand-soft/40", d === today && "text-brand")}>
                        <div className="text-[10px] text-muted uppercase">{WEEKDAYS_SHORT[dow]}</div>
                        <div className="text-sm text-ink">{Number(d.slice(8))}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.roomTypes.map((rt) => {
                  const byDate = new Map(rt.days.map((x) => [x.date, x]));
                  const cellBtn = (d: string, content: React.ReactNode, cls?: string) => (
                    <td key={d} className={cn("border-b border-l border-line p-0 text-center", cls)}>
                      <button type="button" disabled={readOnly} onClick={() => open({ kind: "inventory", roomTypeId: rt.id }, d)} className="h-full w-full px-1 py-1.5 enabled:hover:bg-brand-soft/50 disabled:cursor-default">
                        {content}
                      </button>
                    </td>
                  );
                  return [
                    <tr key={`${rt.id}-h`} className="bg-surface-2/40">
                      <th scope="rowgroup" colSpan={days + 1} className="sticky left-0 border-b border-line px-3 py-2 text-left text-sm font-semibold text-ink">
                        {rt.name} <span className="font-normal text-muted">· {rt.totalRooms} rooms</span>
                      </th>
                    </tr>,
                    <tr key={`${rt.id}-a`}>
                      <th scope="row" className="sticky left-0 z-10 border-r border-b border-line bg-white px-3 py-1.5 text-left font-medium text-ink-2">Available</th>
                      {dates.map((d) => {
                        const x = byDate.get(d);
                        const avail = x?.available ?? rt.totalRooms;
                        return cellBtn(d, <span className={cn("font-semibold", avail === 0 ? "text-danger" : "text-ink")}>{avail}<span className="font-normal text-muted">/{x?.total ?? rt.totalRooms}</span></span>, x?.stopSell ? "bg-danger/10" : undefined);
                      })}
                    </tr>,
                    <tr key={`${rt.id}-s`}>
                      <th scope="row" className="sticky left-0 z-10 border-r border-b border-line bg-white px-3 py-1.5 text-left font-medium text-ink-2">Sold / held</th>
                      {dates.map((d) => {
                        const x = byDate.get(d);
                        return cellBtn(d, <span className="text-muted">{x ? `${x.sold}${x.held ? `+${x.held}` : ""}` : 0}</span>);
                      })}
                    </tr>,
                    <tr key={`${rt.id}-x`}>
                      <th scope="row" className="sticky left-0 z-10 border-r border-b border-line bg-white px-3 py-1.5 text-left font-medium text-ink-2">Stop sell</th>
                      {dates.map((d) => cellBtn(d, byDate.get(d)?.stopSell ? <span className="font-semibold text-danger">Closed</span> : <span className="text-muted">—</span>))}
                    </tr>,
                    ...rt.ratePlans.flatMap((rp) => {
                      const r = new Map(rp.days.map((x) => [x.date, x]));
                      const rateCell = (d: string, content: React.ReactNode, cls?: string) => (
                        <td key={d} className={cn("border-b border-l border-line p-0 text-center", cls)}>
                          <button type="button" disabled={readOnly} onClick={() => open({ kind: "rates", ratePlanId: rp.id }, d)} className="h-full w-full px-1 py-1.5 enabled:hover:bg-brand-soft/50 disabled:cursor-default">
                            {content}
                          </button>
                        </td>
                      );
                      return [
                        <tr key={`${rp.id}-p`}>
                          <th scope="row" className="sticky left-0 z-10 border-r border-b border-line bg-white px-3 py-1.5 text-left font-medium text-ink">
                            <span className="block max-w-40 truncate">{rp.name}</span>
                            <span className="font-normal text-muted">Price</span>
                          </th>
                          {dates.map((d) => {
                            const x = r.get(d);
                            return rateCell(d, x ? <span className="font-medium text-ink tabular-nums">{formatINR(x.price)}</span> : <span className="text-muted">—</span>, x?.stopSell ? "bg-danger/10" : undefined);
                          })}
                        </tr>,
                        <tr key={`${rp.id}-m`}>
                          <th scope="row" className="sticky left-0 z-10 border-r border-b border-line bg-white px-3 py-1.5 pl-6 text-left font-normal text-muted">Min stay</th>
                          {dates.map((d) => rateCell(d, <span className={cn((r.get(d)?.minStay ?? 1) > 1 ? "font-semibold text-warning" : "text-muted")}>{r.get(d)?.minStay ?? 1}</span>))}
                        </tr>,
                        <tr key={`${rp.id}-r`}>
                          <th scope="row" className="sticky left-0 z-10 border-r border-b border-line bg-white px-3 py-1.5 pl-6 text-left font-normal text-muted">CTA / CTD</th>
                          {dates.map((d) => {
                            const x = r.get(d);
                            return rateCell(
                              d,
                              <span className="text-[10px] font-semibold">
                                {x?.closedToArrival && <span className="text-danger">CTA </span>}
                                {x?.closedToDeparture && <span className="text-danger">CTD</span>}
                                {!x?.closedToArrival && !x?.closedToDeparture && <span className="font-normal text-muted">—</span>}
                              </span>,
                            );
                          })}
                        </tr>,
                      ];
                    }),
                  ];
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-3 py-2 text-xs text-muted">
            {readOnly ? "Read-only: managed by your channel manager." : "Click any cell to edit that date, or use Bulk update for ranges."} CTA = closed to arrival, CTD = closed to departure.
          </p>
        </Card>
      )}

      <Modal open={!!bulk} onClose={() => setBulk(null)} title="Update rates & availability" size="lg">
        {bulk && data && propertyId && (
          <BulkForm
            propertyId={propertyId}
            cal={data}
            initial={bulk}
            onClose={() => setBulk(null)}
            onSaved={() => {
              setBulk(null);
              cal.refetch();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function BulkForm({ propertyId, cal, initial, onClose, onSaved }: { propertyId: string; cal: CalendarResponse; initial: { target: Target | null; from: string; to: string }; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const firstRoom = cal.roomTypes[0];
  const [target, setTarget] = useState<string>(
    initial.target ? (initial.target.kind === "inventory" ? `inv:${initial.target.roomTypeId}` : `rate:${initial.target.ratePlanId}`) : firstRoom ? `inv:${firstRoom.id}` : "",
  );
  const [range, setRange] = useState({ from: initial.from, to: initial.to });
  const [dow, setDow] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [total, setTotal] = useState<number | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [minStay, setMinStay] = useState<number | null>(null);
  const [maxStay, setMaxStay] = useState<number | null>(null);
  const [stopSell, setStopSell] = useState<Tri>("");
  const [cta, setCta] = useState<Tri>("");
  const [ctd, setCtd] = useState<Tri>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isInv = target.startsWith("inv:");
  const id = target.split(":")[1];
  const room = cal.roomTypes.find((r) => r.id === id);

  const submit = async () => {
    setErr(null);
    if (!range.from || !range.to || range.to < range.from) return setErr("Choose a valid date range");
    if (!dow.length) return setErr("Pick at least one weekday");
    const common = { from: range.from, to: range.to, daysOfWeek: dow.length === 7 ? undefined : dow };
    let body: Record<string, unknown>;
    if (isInv) {
      if (total != null && room && total > room.totalRooms) return setErr(`You have only ${room.totalRooms} rooms of this type`);
      body = { roomTypeId: id, ...common, total: total ?? undefined, stopSell: tri(stopSell) };
      if (body.total === undefined && body.stopSell === undefined) return setErr("Change at least one field");
    } else {
      if (minStay != null && maxStay != null && maxStay < minStay) return setErr("Max stay must be ≥ min stay");
      body = { ratePlanId: id, ...common, price: price ?? undefined, minStay: minStay ?? undefined, maxStay: maxStay ?? undefined, closedToArrival: tri(cta), closedToDeparture: tri(ctd), stopSell: tri(stopSell) };
      if (Object.entries(body).every(([k, v]) => ["ratePlanId", "from", "to", "daysOfWeek"].includes(k) || v === undefined)) return setErr("Change at least one field");
    }
    setBusy(true);
    try {
      await api(`/partner/properties/${propertyId}/calendar/${isInv ? "inventory" : "rates"}`, { method: "PUT", body });
      toast.success("Calendar updated");
      onSaved();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const triSelect = (label: string, v: Tri, setV: (t: Tri) => void, yes = "Yes", no = "No") => (
    <Field label={label}>
      <Select value={v} onChange={(e) => setV(e.target.value as Tri)}>
        <option value="">No change</option>
        <option value="true">{yes}</option>
        <option value="false">{no}</option>
      </Select>
    </Field>
  );

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field label="Apply to">
        <Select value={target} onChange={(e) => setTarget(e.target.value)}>
          {cal.roomTypes.map((rt) => (
            <optgroup key={rt.id} label={rt.name}>
              <option value={`inv:${rt.id}`}>{rt.name} — rooms to sell / stop-sell</option>
              {rt.ratePlans.map((rp) => (
                <option key={rp.id} value={`rate:${rp.id}`}>
                  {rt.name} · {rp.name} — price & restrictions
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-muted">Days of week</legend>
        <div className="flex flex-wrap gap-1">
          {WEEKDAYS_SHORT.map((d, i) => (
            <button
              key={d}
              type="button"
              aria-pressed={dow.includes(i)}
              onClick={() => setDow(dow.includes(i) ? dow.filter((x) => x !== i) : [...dow, i].sort())}
              className={cn("h-8 min-w-11 rounded-lg border px-2 text-xs font-medium", dow.includes(i) ? "border-brand bg-brand text-white" : "border-line bg-white text-ink")}
            >
              {d}
            </button>
          ))}
        </div>
      </fieldset>
      {isInv ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rooms to sell" hint={room ? `Out of ${room.totalRooms}; leave empty for no change` : undefined}>
            <NumberInput min={0} max={room?.totalRooms} value={total} onChange={setTotal} />
          </Field>
          {triSelect("Stop sell", stopSell, setStopSell, "Close (stop sell)", "Open")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nightly price" hint="Leave empty for no change">
            <MoneyInput value={price} onChange={setPrice} />
          </Field>
          {triSelect("Stop sell", stopSell, setStopSell, "Close", "Open")}
          <Field label="Min stay (nights)">
            <NumberInput min={1} max={30} value={minStay} onChange={setMinStay} />
          </Field>
          <Field label="Max stay (nights)">
            <NumberInput min={1} max={90} value={maxStay} onChange={setMaxStay} />
          </Field>
          {triSelect("Closed to arrival", cta, setCta)}
          {triSelect("Closed to departure", ctd, setCtd)}
        </div>
      )}
      {err && (
        <p role="alert" className="text-sm text-danger">
          {err}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          Apply
        </Button>
      </div>
    </form>
  );
}
