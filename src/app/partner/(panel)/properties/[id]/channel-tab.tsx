"use client";

import { useState } from "react";
import { Cable, CheckCircle2, Link2Off, Power } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import { CHANNEL_PROVIDER_LABELS, type ChannelConnection, type ChannelProvider, type ChannelSyncLog, type Paginated, type PartnerPropertyDetail } from "@/lib/types";
import type { PartnerChannelInfo } from "@/lib/panel-types";
import { Button, Field, Input, Skeleton, ErrorState, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { Alert, KeyValue, Section } from "@/components/panel/page";
import { StatusBadge } from "@/components/panel/status-badge";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { ChannelLogsTable } from "@/components/panel/channel-logs";
import { formatDateTime } from "@/components/panel/labels";
import { sameJson } from "@/components/panel/unsaved";

type RoomList = PartnerChannelInfo["roomTypes"];

/** GET /partner/properties/:id/channel may return `{ connection, roomTypes }`, a bare connection (optionally with roomTypes) or null. */
function normalize(d: unknown, property: PartnerPropertyDetail): PartnerChannelInfo {
  const fallbackRooms: RoomList = property.roomTypes.map((r) => ({ id: r.id, name: r.name, status: r.status, ratePlans: r.ratePlans.map((p) => ({ id: p.id, name: p.name })) }));
  if (!d || typeof d !== "object") return { connection: null, roomTypes: fallbackRooms };
  if ("connection" in d) {
    const x = d as PartnerChannelInfo;
    return { connection: x.connection, roomTypes: x.roomTypes?.length ? x.roomTypes : fallbackRooms };
  }
  if ("provider" in d) {
    const c = d as ChannelConnection & { roomTypes?: RoomList };
    return { connection: c, roomTypes: c.roomTypes?.length ? c.roomTypes : fallbackRooms };
  }
  return { connection: null, roomTypes: fallbackRooms };
}

type MapState = Record<string, { room: string; rates: Record<string, string> }>;

function mapStateFrom(conn: ChannelConnection | null, rooms: RoomList): MapState {
  const out: MapState = {};
  for (const r of rooms) {
    const rows = conn?.mappings.filter((m) => m.roomTypeId === r.id) ?? [];
    out[r.id] = { room: rows[0]?.cmRoomCode ?? "", rates: Object.fromEntries(r.ratePlans.map((p) => [p.id, rows.find((m) => m.ratePlanId === p.id)?.cmRateCode ?? ""])) };
  }
  return out;
}

export function ChannelTab({ property, onChanged }: { property: PartnerPropertyDetail; onChanged: () => void }) {
  const toast = useToast();
  const base = `/partner/properties/${property.id}/channel`;
  const { data, error, loading, refetch } = useApi<unknown>(base);
  const info = data !== undefined ? normalize(data, property) : null;
  const conn = info?.connection ?? null;
  const [logsPage, setLogsPage] = useState(1);
  const logs = useApi<Paginated<ChannelSyncLog>>(conn ? `${base}/logs` : null, { page: logsPage, limit: 20 });
  const [disconnecting, setDisconnecting] = useState(false);
  const [activating, setActivating] = useState(false);

  const reload = () => {
    refetch();
    onChanged();
  };

  if (error && data === undefined) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!info) return <Skeleton className="h-64" />;

  const rooms = info.roomTypes.filter((r) => r.status !== "INACTIVE");
  const unmapped = conn ? rooms.filter((r) => !conn.mappings.some((m) => m.roomTypeId === r.id)) : rooms;

  return (
    <div className="space-y-4">
      <Alert tone="info" title="How channel managers work">
        Connect one channel manager per property. Once active, rates and availability come from your channel manager and are read-only here; BookMeStays bookings are pushed to it automatically.
      </Alert>
      {!conn ? (
        <ConnectForm base={base} onDone={reload} />
      ) : (
        <>
          <Section
            title={`${CHANNEL_PROVIDER_LABELS[conn.provider]} connection`}
            actions={
              <>
                <StatusBadge kind="channel" status={conn.status} />
                <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setDisconnecting(true)}>
                  <Link2Off className="size-4" /> Disconnect
                </Button>
              </>
            }
          >
            <KeyValue
              cols={3}
              items={[
                { label: "Hotel code in channel manager", value: <span className="font-mono">{conn.cmPropertyCode}</span> },
                { label: "Activated", value: formatDateTime(conn.activatedAt) },
                { label: "Mapped room types", value: `${rooms.length - unmapped.length} / ${rooms.length}` },
                { label: "Last update received", value: formatDateTime(conn.lastInboundAt) },
                { label: "Last booking pushed", value: formatDateTime(conn.lastOutboundAt) },
              ]}
            />
            {conn.lastError && (
              <Alert tone="danger" title="Last error" className="mt-4">
                {conn.lastError}
              </Alert>
            )}
            {conn.status !== "ACTIVE" && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <Button
                  loading={activating}
                  disabled={unmapped.length > 0}
                  onClick={async () => {
                    setActivating(true);
                    try {
                      await api(`${base}/activate`, { method: "POST" });
                      toast.success("Channel manager activated — rates & availability are now managed there");
                      reload();
                    } catch (e) {
                      toast.error(errorMessage(e));
                    } finally {
                      setActivating(false);
                    }
                  }}
                >
                  <Power className="size-4" /> Activate
                </Button>
                <p className="text-sm text-muted">{unmapped.length ? `Map ${unmapped.map((r) => r.name).join(", ")} first.` : "All room types are mapped. Activate once your channel manager confirms the connection."}</p>
              </div>
            )}
          </Section>
          <MappingEditor base={base} conn={conn} rooms={rooms} onSaved={reload} />
          <div>
            <h2 className="mb-2 text-base font-semibold text-ink">Sync log</h2>
            <ChannelLogsTable
              data={logs.data}
              loading={logs.loading}
              error={logs.error}
              refetch={logs.refetch}
              showProvider={false}
              pagination={logs.data ? { page: logs.data.page, totalPages: logs.data.totalPages, total: logs.data.total, limit: logs.data.limit, onPageChange: setLogsPage } : undefined}
            />
          </div>
        </>
      )}
      <ConfirmDialog
        open={disconnecting}
        onClose={() => setDisconnecting(false)}
        title="Disconnect channel manager?"
        description="Rates and availability become editable in BookMeStays again and bookings are no longer pushed to your channel manager."
        tone="danger"
        confirmLabel="Disconnect"
        onConfirm={async () => {
          await api(base, { method: "DELETE" });
          toast.success("Disconnected");
          reload();
        }}
      />
      {loading && <span className="sr-only">Refreshing</span>}
    </div>
  );
}

function ConnectForm({ base, onDone }: { base: string; onDone: () => void }) {
  const toast = useToast();
  const [provider, setProvider] = useState<ChannelProvider | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  return (
    <Section title="Connect a channel manager" description="Step 1 of 3 — choose your provider and enter the hotel code they gave you.">
      <form
        noValidate
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setTouched(true);
          if (!provider || !code.trim()) return;
          setBusy(true);
          try {
            await api(base, { method: "POST", body: { provider, cmPropertyCode: code.trim() } });
            toast.success("Connection created — now map your rooms");
            onDone();
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Provider</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(CHANNEL_PROVIDER_LABELS) as ChannelProvider[]).map((p) => (
              <label key={p} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-medium", provider === p ? "border-brand bg-brand-soft/40 text-ink" : "border-line text-ink-2 hover:border-ink/30")}>
                <input type="radio" name="provider" className="accent-brand" checked={provider === p} onChange={() => setProvider(p)} />
                <Cable className="size-4 text-muted" /> {CHANNEL_PROVIDER_LABELS[p]}
              </label>
            ))}
          </div>
          {touched && !provider && <p className="mt-1 text-xs text-danger">Choose your channel manager</p>}
        </fieldset>
        <Field label="Hotel / property code in your channel manager" required error={touched && !code.trim() ? "Enter the hotel code" : null} className="max-w-sm">
          <Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono" placeholder="e.g. 12345" />
        </Field>
        <Button type="submit" loading={busy}>
          Connect
        </Button>
      </form>
    </Section>
  );
}

function MappingEditor({ base, conn, rooms, onSaved }: { base: string; conn: ChannelConnection; rooms: RoomList; onSaved: () => void }) {
  const toast = useToast();
  const initial = mapStateFrom(conn, rooms);
  const [state, setState] = useState<MapState>(initial);
  const [baseline, setBaseline] = useState(initial);
  if (!sameJson(initial, baseline)) {
    setBaseline(initial);
    setState(initial);
  }
  const [busy, setBusy] = useState(false);
  const dirty = !sameJson(state, baseline);
  const readOnly = conn.status === "ACTIVE";

  return (
    <Section title="Room & rate mapping" description={`Step 2 — enter the room and rate codes exactly as they appear in ${CHANNEL_PROVIDER_LABELS[conn.provider]}.`}>
      {rooms.length === 0 ? (
        <p className="text-sm text-muted">Add room types first.</p>
      ) : (
        <div className="space-y-4">
          {rooms.map((r) => (
            <div key={r.id} className="rounded-lg border border-line p-3">
              <div className="grid items-end gap-3 sm:grid-cols-[1fr_14rem]">
                <p className="font-medium text-ink">
                  {r.name}
                  {state[r.id]?.room && <CheckCircle2 className="ml-1 inline size-4 text-success" aria-label="mapped" />}
                </p>
                <Field label="CM room code">
                  <Input className="h-9 font-mono" readOnly={readOnly} value={state[r.id]?.room ?? ""} onChange={(e) => setState({ ...state, [r.id]: { ...state[r.id], room: e.target.value } })} />
                </Field>
              </div>
              {r.ratePlans.length > 0 && (
                <ul className="mt-2 space-y-2 border-t border-line pt-2">
                  {r.ratePlans.map((p) => (
                    <li key={p.id} className="grid items-center gap-3 sm:grid-cols-[1fr_14rem]">
                      <span className="pl-3 text-sm text-ink-2">↳ {p.name}</span>
                      <Input
                        aria-label={`CM rate code for ${r.name} — ${p.name}`}
                        placeholder="CM rate code"
                        className="h-9 font-mono"
                        readOnly={readOnly}
                        value={state[r.id]?.rates[p.id] ?? ""}
                        onChange={(e) => setState({ ...state, [r.id]: { ...state[r.id], rates: { ...state[r.id].rates, [p.id]: e.target.value } } })}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {readOnly ? (
            <p className="text-xs text-muted">Mappings are locked while the connection is active. Ask BookMeStays support to disable it temporarily if you need to change codes.</p>
          ) : (
            <div className="flex justify-end">
              <Button
                loading={busy}
                disabled={!dirty}
                onClick={async () => {
                  const mappings = rooms.flatMap((r) => {
                    const m = state[r.id];
                    if (!m?.room.trim()) return [];
                    return [
                      { roomTypeId: r.id, cmRoomCode: m.room.trim() },
                      ...r.ratePlans.filter((p) => m.rates[p.id]?.trim()).map((p) => ({ roomTypeId: r.id, ratePlanId: p.id, cmRoomCode: m.room.trim(), cmRateCode: m.rates[p.id].trim() })),
                    ];
                  });
                  setBusy(true);
                  try {
                    await api(`${base}/mappings`, { method: "PUT", body: { mappings } });
                    toast.success("Mappings saved");
                    onSaved();
                  } catch (e) {
                    toast.error(errorMessage(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Save mappings
              </Button>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
