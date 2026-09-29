"use client";

import { useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import type { BookingSettings, SupportSettings, TaxSettings } from "@/lib/panel-types";
import type { RankingSettings } from "@/lib/types";
import { Button, ErrorState, Field, Input, Skeleton, useToast } from "@/components/ui";
import { PageHeader, Section } from "@/components/panel/page";
import { MoneyInput, NumberInput, PercentInput } from "@/components/panel/inputs";
import { sameJson } from "@/components/panel/unsaved";
import { formatINR } from "@/lib/format";

/** GET may return the raw value or `{ key, value }`. */
function unwrap<T>(d: unknown): T | undefined {
  if (d && typeof d === "object" && "value" in d && "key" in d) return (d as { value: T }).value;
  return d as T | undefined;
}

function SettingsBlock<T extends object>({
  settingKey,
  title,
  description,
  defaults,
  validate,
  children,
}: {
  settingKey: string;
  title: string;
  description: string;
  defaults: T;
  validate?: (v: T) => string | null;
  children: (v: T, set: (p: Partial<T>) => void) => ReactNode;
}) {
  const toast = useToast();
  const { data, error, loading, refetch } = useApi<unknown>(`/admin/settings/${settingKey}`);
  const loaded = data !== undefined ? ({ ...defaults, ...(unwrap<T>(data) ?? {}) } as T) : null;
  const [draft, setDraft] = useState<T | null>(null);
  const [base, setBase] = useState<T | null>(null);
  if (loaded && !sameJson(loaded, base)) {
    setBase(loaded);
    setDraft(loaded);
  }
  const [busy, setBusy] = useState(false);
  const dirty = !!draft && !sameJson(draft, base);
  const err = draft && validate ? validate(draft) : null;

  return (
    <Section
      title={title}
      description={description}
      actions={
        <Button
          size="sm"
          loading={busy}
          disabled={!dirty || !!err}
          onClick={async () => {
            if (!draft) return;
            setBusy(true);
            try {
              await api(`/admin/settings/${settingKey}`, { method: "PUT", body: draft });
              toast.success(`${title} saved`);
              refetch();
            } catch (e) {
              toast.error(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Save
        </Button>
      }
    >
      {error && !data ? <ErrorState message={error.message} onRetry={refetch} /> : loading && !draft ? <Skeleton className="h-32" /> : draft && children(draft, (p) => setDraft({ ...draft, ...p }))}
      {err && <p className="mt-2 text-xs text-danger">{err}</p>}
    </Section>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Platform-wide configuration. Changes apply to new bookings only." />
      <div className="space-y-4">
        <SettingsBlock<TaxSettings>
          settingKey="tax"
          title="Taxes"
          description="Room GST slabs are chosen per night on that night's room price."
          defaults={{ roomGstSlabs: [], commissionGstBps: 1800, tcsBps: 50, tdsBps: 10 }}
          validate={(v) => {
            if (!v.roomGstSlabs.length) return "Add at least one GST slab";
            if (v.roomGstSlabs[v.roomGstSlabs.length - 1].upToPerNight !== null) return "The last slab must have no upper limit";
            return null;
          }}
        >
          {(v, set) => (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Room GST slabs</p>
                <ul className="space-y-2">
                  {v.roomGstSlabs.map((s, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="w-32 text-ink-2">{i === 0 ? "Nightly price up to" : "then up to"}</span>
                      {s.upToPerNight === null ? (
                        <span className="w-40 text-muted">No limit</span>
                      ) : (
                        <MoneyInput className="w-40" aria-label={`Slab ${i + 1} limit`} value={s.upToPerNight} onChange={(n) => set({ roomGstSlabs: v.roomGstSlabs.map((x, j) => (j === i ? { ...x, upToPerNight: n ?? 0 } : x)) })} />
                      )}
                      <span className="text-ink-2">→ GST</span>
                      <PercentInput className="w-24" aria-label={`Slab ${i + 1} rate`} value={s.rateBps} onChange={(n) => set({ roomGstSlabs: v.roomGstSlabs.map((x, j) => (j === i ? { ...x, rateBps: n ?? 0 } : x)) })} />
                      <button type="button" aria-label="Remove slab" className="rounded p-1.5 text-muted hover:text-danger" onClick={() => set({ roomGstSlabs: v.roomGstSlabs.filter((_, j) => j !== i) })}>
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    const slabs = v.roomGstSlabs.map((s) => (s.upToPerNight === null ? { ...s, upToPerNight: 750000 } : s));
                    set({ roomGstSlabs: [...slabs, { upToPerNight: null, rateBps: 1800 }] });
                  }}
                >
                  <Plus className="size-4" /> Add slab
                </Button>
                <p className="mt-2 text-xs text-muted">
                  e.g. up to {formatINR(750000)}/night → 5%, above → 18%. The last slab applies to everything above the previous limit.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="GST on commission">
                  <PercentInput value={v.commissionGstBps} onChange={(n) => set({ commissionGstBps: n ?? 0 })} />
                </Field>
                <Field label="TCS (on room amount)">
                  <PercentInput value={v.tcsBps} onChange={(n) => set({ tcsBps: n ?? 0 })} />
                </Field>
                <Field label="TDS (on room amount)">
                  <PercentInput value={v.tdsBps} onChange={(n) => set({ tdsBps: n ?? 0 })} />
                </Field>
              </div>
            </div>
          )}
        </SettingsBlock>

        <SettingsBlock<BookingSettings>
          settingKey="booking"
          title="Booking"
          description="Inventory hold while the guest pays, and booking limits."
          defaults={{ holdMinutes: 15, maxRoomsPerBooking: 5, maxNights: 30 }}
          validate={(v) => (v.holdMinutes < 5 || v.holdMinutes > 60 ? "Hold must be 5–60 minutes" : null)}
        >
          {(v, set) => (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Payment hold (minutes)">
                <NumberInput min={5} max={60} value={v.holdMinutes} onChange={(n) => set({ holdMinutes: n ?? 15 })} />
              </Field>
              <Field label="Max rooms per booking">
                <NumberInput min={1} value={v.maxRoomsPerBooking} onChange={(n) => set({ maxRoomsPerBooking: n ?? 1 })} />
              </Field>
              <Field label="Max nights per booking">
                <NumberInput min={1} value={v.maxNights} onChange={(n) => set({ maxNights: n ?? 1 })} />
              </Field>
            </div>
          )}
        </SettingsBlock>

        <SettingsBlock<RankingSettings>
          settingKey="ranking"
          title="Stay ranking"
          description="How stays are ordered on the homepage, category pages and search."
          defaults={{ mode: "MOST_BOOKED_FIRST" }}
        >
          {(v, set) => (
            <fieldset className="space-y-2">
              <legend className="sr-only">Ranking mode</legend>
              {(
                [
                  {
                    mode: "MOST_BOOKED_FIRST" as const,
                    title: "Most booked first (recommended)",
                    hint: "Stays guests actually book rise to the top: completed stays minus half a point per cancellation. Your rank number breaks ties.",
                  },
                  {
                    mode: "PINS_FIRST" as const,
                    title: "My order first",
                    hint: "The Featured / Recommended flags and the rank number you set on each property decide the order; bookings only break ties.",
                  },
                ]
              ).map((o) => (
                <label
                  key={o.mode}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${v.mode === o.mode ? "border-brand bg-brand-soft" : "border-line"}`}
                >
                  <input
                    type="radio"
                    name="ranking-mode"
                    className="mt-1 size-4 accent-[var(--brand)]"
                    checked={v.mode === o.mode}
                    onChange={() => set({ mode: o.mode })}
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">{o.title}</span>
                    <span className="block text-xs text-muted">{o.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
        </SettingsBlock>

        <SettingsBlock<SupportSettings> settingKey="support" title="Support contacts" description="Shown in the site footer, emails and booking confirmations." defaults={{ phone: "", email: "", whatsapp: "", social: {} }}>
          {(v, set) => (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Phone">
                <Input type="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value })} />
              </Field>
              <Field label="Email">
                <Input type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} />
              </Field>
              <Field label="WhatsApp">
                <Input type="tel" value={v.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
              </Field>
              {["instagram", "facebook", "youtube", "x", "linkedin"].map((k) => (
                <Field key={k} label={k === "x" ? "X (Twitter)" : k[0].toUpperCase() + k.slice(1)}>
                  <Input type="url" placeholder="https://" value={v.social?.[k] ?? ""} onChange={(e) => set({ social: { ...v.social, [k]: e.target.value } })} />
                </Field>
              ))}
            </div>
          )}
        </SettingsBlock>
      </div>
    </>
  );
}
