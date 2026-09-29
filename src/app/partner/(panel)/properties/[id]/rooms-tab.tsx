"use client";

import { useState, type ReactNode } from "react";
import { BedDouble, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/use-api";
import { formatINR } from "@/lib/format";
import { MEAL_PLAN_LABELS, type CancellationPolicy, type MealPlan, type PartnerPropertyDetail, type RatePlan, type RoomType } from "@/lib/types";
import { Badge, Button, Card, Checkbox, EmptyState, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { StatusBadge } from "@/components/panel/status-badge";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { MediaManager } from "@/components/panel/media-manager";
import { MoneyInput, NumberInput, StringListEditor, Toggle } from "@/components/panel/inputs";
import { CancellationPolicyEditor, PolicySummary, validatePolicy } from "@/components/panel/cancellation-policy-editor";
import { AmenitiesPicker } from "@/components/panel/property-form";
import { Alert, Tabs } from "@/components/panel/page";
import { nullIfEmpty, useSiteMeta } from "@/components/panel/util";

export function RoomsTab({
  property,
  onChanged,
  apiBase = "/partner",
  roomActions,
  roomBadges,
}: {
  property: PartnerPropertyDetail;
  onChanged: () => void;
  /** "/admin" when the admin panel edits rooms on the partner's behalf */
  apiBase?: "/partner" | "/admin";
  roomActions?: (rt: RoomType) => ReactNode;
  roomBadges?: (rt: RoomType) => ReactNode;
}) {
  const toast = useToast();
  const [editingRoom, setEditingRoom] = useState<RoomType | "new" | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<RoomType | null>(null);
  const [plan, setPlan] = useState<{ room: RoomType; plan: RatePlan | null } | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<RatePlan | null>(null);

  return (
    <div className="space-y-4">
      {apiBase === "/partner" && property.status === "LIVE" && <Alert tone="info">New room types on a live property are reviewed by BookMeStays before guests can book them. Rates & availability are managed in the calendar.</Alert>}
      <div className="flex justify-end">
        <Button onClick={() => setEditingRoom("new")}>
          <Plus className="size-4" /> Add room type
        </Button>
      </div>
      {property.roomTypes.length === 0 ? (
        <Card>
          <EmptyState icon={<BedDouble />} title="No room types yet" description="Add each kind of room you sell (e.g. Deluxe Room, Pool Villa) with at least one rate plan." />
        </Card>
      ) : (
        property.roomTypes.map((rt) => (
          <Card key={rt.id} className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink">{rt.name}</h3>
                  <StatusBadge kind="roomType" status={rt.status} />
                  {roomBadges?.(rt)}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {[`${rt.totalRooms} rooms`, `up to ${rt.maxAdults} adults${rt.maxChildren ? ` + ${rt.maxChildren} children` : ""}`, rt.bedConfig, rt.sizeSqft && `${rt.sizeSqft} sq ft`, rt.viewType, `${rt.media.length} photos`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex gap-1">
                {roomActions?.(rt)}
                <Button size="sm" variant="outline" onClick={() => setEditingRoom(rt)}>
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${rt.name}`} className="hover:text-danger" onClick={() => setDeletingRoom(rt)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-muted uppercase">Rate plans</p>
                <Button size="sm" variant="ghost" onClick={() => setPlan({ room: rt, plan: null })}>
                  <Plus className="size-4" /> Add rate plan
                </Button>
              </div>
              {rt.ratePlans.length === 0 ? (
                <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-ink">Add at least one rate plan so guests can book this room.</p>
              ) : (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {rt.ratePlans.map((rp) => (
                    <li key={rp.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">
                          {rp.name} {!rp.isActive && <Badge className="ml-1">Inactive</Badge>}
                          {!rp.isRefundable && <Badge tone="danger" className="ml-1">Non-refundable</Badge>}
                        </p>
                        <p className="text-xs text-muted">
                          {MEAL_PLAN_LABELS[rp.mealPlan]}
                          {rp.inclusions.length ? ` · ${rp.inclusions.join(", ")}` : ""}
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-sm font-semibold text-ink">{formatINR(rp.basePrice)}</p>
                        <p className="text-muted">+{formatINR(rp.extraAdultPrice)} adult · +{formatINR(rp.extraChildPrice)} child</p>
                      </div>
                      <div className="flex">
                        <Button size="sm" variant="ghost" aria-label={`Edit ${rp.name}`} onClick={() => setPlan({ room: rt, plan: rp })}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" aria-label={`Delete ${rp.name}`} className="hover:text-danger" onClick={() => setDeletingPlan(rp)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        ))
      )}

      <Modal open={!!editingRoom} onClose={() => setEditingRoom(null)} title={editingRoom === "new" ? "New room type" : "Edit room type"} size="xl">
        {editingRoom && (
          <RoomTypeForm
            propertyId={property.id}
            room={editingRoom === "new" ? null : editingRoom}
            onClose={() => setEditingRoom(null)}
            onSaved={onChanged}
            apiBase={apiBase}
          />
        )}
      </Modal>
      <Modal open={!!plan} onClose={() => setPlan(null)} title={plan?.plan ? `Edit rate plan — ${plan.room.name}` : `New rate plan — ${plan?.room.name ?? ""}`} size="lg">
        {plan && (
          <RatePlanForm
            room={plan.room}
            plan={plan.plan}
            propertyPolicy={property.cancellationPolicy}
            apiBase={apiBase}
            onClose={() => setPlan(null)}
            onSaved={() => {
              setPlan(null);
              onChanged();
            }}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={!!deletingRoom}
        onClose={() => setDeletingRoom(null)}
        title={`Delete ${deletingRoom?.name}?`}
        description="Room types with bookings can't be deleted — set total rooms to 0 or stop-sell in the calendar instead."
        tone="danger"
        confirmLabel="Delete"
        onConfirm={async () => {
          await api(`${apiBase}/room-types/${deletingRoom?.id}`, { method: "DELETE" });
          toast.success("Room type deleted");
          onChanged();
        }}
      />
      <ConfirmDialog
        open={!!deletingPlan}
        onClose={() => setDeletingPlan(null)}
        title={`Delete ${deletingPlan?.name}?`}
        tone="danger"
        confirmLabel="Delete"
        onConfirm={async () => {
          await api(`${apiBase}/rate-plans/${deletingPlan?.id}`, { method: "DELETE" });
          toast.success("Rate plan deleted");
          onChanged();
        }}
      />
    </div>
  );
}

/** Shared with the admin panel: `apiBase` "/admin" edits on the partner's behalf (amenities go in the same PATCH). */
export function RoomTypeForm({
  propertyId,
  room,
  onClose,
  onSaved,
  apiBase = "/partner",
}: {
  propertyId: string;
  room: RoomType | null;
  onClose: () => void;
  onSaved: () => void;
  apiBase?: "/partner" | "/admin";
}) {
  const toast = useToast();
  const meta = useSiteMeta();
  const [tab, setTab] = useState<"details" | "amenities" | "media">("details");
  const [saved, setSaved] = useState<RoomType | null>(room);
  const [f, setF] = useState({
    name: room?.name ?? "",
    description: room?.description ?? "",
    maxAdults: room?.maxAdults ?? 2,
    maxChildren: room?.maxChildren ?? 1,
    maxOccupancy: room?.maxOccupancy ?? 3,
    bedConfig: room?.bedConfig ?? "",
    sizeSqft: room?.sizeSqft ?? null,
    viewType: room?.viewType ?? "",
    totalRooms: room?.totalRooms ?? 1,
    basePrice: room?.basePrice ?? null,
  });
  const [amenityIds, setAmenityIds] = useState<string[]>(room?.amenities.map((a) => a.id) ?? []);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const errs = {
    name: f.name.trim().length < 2 ? "Name is required" : null,
    maxAdults: !f.maxAdults || f.maxAdults < 1 ? "At least 1" : null,
    maxOccupancy: f.maxOccupancy != null && f.maxOccupancy < (f.maxAdults ?? 1) ? "Must be ≥ max adults" : null,
    totalRooms: f.totalRooms == null || f.totalRooms < 0 ? "Enter number of rooms" : null,
    basePrice: !f.basePrice ? "Enter the base nightly price" : null,
  };

  const submit = async () => {
    setTouched(true);
    if (Object.values(errs).some(Boolean)) return setTab("details");
    setBusy(true);
    try {
      const body = {
        name: f.name.trim(),
        description: nullIfEmpty(f.description),
        maxAdults: f.maxAdults,
        maxChildren: f.maxChildren ?? 0,
        maxOccupancy: f.maxOccupancy ?? f.maxAdults + (f.maxChildren ?? 0),
        bedConfig: nullIfEmpty(f.bedConfig),
        sizeSqft: f.sizeSqft,
        viewType: nullIfEmpty(f.viewType),
        totalRooms: f.totalRooms,
        basePrice: f.basePrice,
      };
      const rt = await api<RoomType>(saved ? `${apiBase}/room-types/${saved.id}` : `${apiBase}/properties/${propertyId}/room-types`, {
        method: saved ? "PATCH" : "POST",
        body: apiBase === "/admin" ? { ...body, amenityIds } : body,
      });
      if (apiBase === "/partner") await api(`/partner/room-types/${rt.id}/amenities`, { method: "PUT", body: { amenityIds } });
      toast.success(saved ? "Room type saved" : "Room type created — now add photos and a rate plan");
      onSaved();
      if (!saved) {
        setSaved(rt);
        setTab("media");
      } else onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "details", label: "Details" },
          { key: "amenities", label: `Amenities (${amenityIds.length})` },
          { key: "media", label: "Photos & videos" },
        ]}
      />
      {tab === "details" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Room type name" required error={touched ? errs.name : null} className="sm:col-span-2">
            <Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Deluxe Room with Balcony" />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea rows={3} value={f.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <Field label="Max adults" required error={touched ? errs.maxAdults : null}>
              <NumberInput min={1} max={20} value={f.maxAdults} onChange={(v) => set({ maxAdults: v ?? 1 })} />
            </Field>
            <Field label="Max children">
              <NumberInput min={0} max={20} value={f.maxChildren} onChange={(v) => set({ maxChildren: v ?? 0 })} />
            </Field>
            <Field label="Max guests" error={touched ? errs.maxOccupancy : null}>
              <NumberInput min={1} max={40} value={f.maxOccupancy} onChange={(v) => set({ maxOccupancy: v ?? 1 })} />
            </Field>
          </div>
          <Field label="Bed configuration">
            <Input value={f.bedConfig} onChange={(e) => set({ bedConfig: e.target.value })} placeholder="1 King bed" />
          </Field>
          <Field label="View">
            <Input value={f.viewType} onChange={(e) => set({ viewType: e.target.value })} placeholder="Sea view" />
          </Field>
          <Field label="Room size (sq ft)">
            <NumberInput min={0} value={f.sizeSqft} onChange={(v) => set({ sizeSqft: v })} />
          </Field>
          <Field label="Number of rooms" required error={touched ? errs.totalRooms : null} hint="Physical rooms of this type">
            <NumberInput min={0} value={f.totalRooms} onChange={(v) => set({ totalRooms: v ?? 0 })} />
          </Field>
          <Field label="Base nightly price" required error={touched ? errs.basePrice : null} hint="Default price for 2 adults; rate plans can differ">
            <MoneyInput value={f.basePrice} onChange={(v) => set({ basePrice: v })} />
          </Field>
        </div>
      )}
      {tab === "amenities" && (meta.data ? <AmenitiesPicker amenities={meta.data.amenities} value={amenityIds} onChange={setAmenityIds} scope="ROOM" /> : <p className="text-sm text-muted">Loading…</p>)}
      {tab === "media" && <MediaManager ownerType="ROOM_TYPE" ownerId={saved?.id ?? null} tags={["ROOM", "ROOM_WALKTHROUGH", "BATHROOM", "VIEW", "AMENITY", "OTHER"]} defaultTag="ROOM" />}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onClose}>
          {saved && !room ? "Done" : "Cancel"}
        </Button>
        {tab !== "media" && (
          <Button type="submit" loading={busy}>
            {saved ? "Save room type" : "Create room type"}
          </Button>
        )}
      </div>
    </form>
  );
}

export function RatePlanForm({
  room,
  plan,
  propertyPolicy,
  onClose,
  onSaved,
  apiBase = "/partner",
}: {
  room: RoomType;
  plan: RatePlan | null;
  propertyPolicy: CancellationPolicy | null;
  onClose: () => void;
  onSaved: () => void;
  apiBase?: "/partner" | "/admin";
}) {
  const toast = useToast();
  const [f, setF] = useState({
    name: plan?.name ?? (room.ratePlans.length ? "" : "Room only"),
    mealPlan: plan?.mealPlan ?? ("EP" as MealPlan),
    inclusions: plan?.inclusions ?? [],
    isRefundable: plan?.isRefundable ?? true,
    override: !!plan?.cancellationPolicy,
    cancellationPolicy: plan?.cancellationPolicy ?? propertyPolicy ?? { summary: "", rules: [] },
    basePrice: (plan?.basePrice ?? room.basePrice ?? null) as number | null,
    extraAdultPrice: plan?.extraAdultPrice ?? 0,
    extraChildPrice: plan?.extraChildPrice ?? 0,
    isActive: plan?.isActive ?? true,
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const errs = {
    name: !f.name.trim() ? "Name is required" : null,
    basePrice: !f.basePrice ? "Enter the nightly price" : null,
    policy: f.isRefundable && f.override ? validatePolicy(f.cancellationPolicy) : null,
  };
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (errs.name || errs.basePrice || errs.policy) return;
        setBusy(true);
        try {
          const body = {
            name: f.name.trim(),
            mealPlan: f.mealPlan,
            inclusions: f.inclusions,
            isRefundable: f.isRefundable,
            cancellationPolicy: !f.isRefundable ? { summary: "Non-refundable. No refund on cancellation or no-show.", rules: [{ hoursBeforeCheckIn: 0, refundPercent: 0 }] } : f.override ? f.cancellationPolicy : null,
            basePrice: f.basePrice,
            extraAdultPrice: f.extraAdultPrice ?? 0,
            extraChildPrice: f.extraChildPrice ?? 0,
            isActive: f.isActive,
          };
          await api(plan ? `${apiBase}/rate-plans/${plan.id}` : `${apiBase}/room-types/${room.id}/rate-plans`, { method: plan ? "PATCH" : "POST", body });
          toast.success("Rate plan saved");
          onSaved();
        } catch (err) {
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plan name" required error={touched ? errs.name : null}>
          <Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Breakfast included" />
        </Field>
        <Field label="Meal plan">
          <Select value={f.mealPlan} onChange={(e) => set({ mealPlan: e.target.value as MealPlan })}>
            {(Object.keys(MEAL_PLAN_LABELS) as MealPlan[]).map((m) => (
              <option key={m} value={m}>
                {m} — {MEAL_PLAN_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nightly price" required error={touched ? errs.basePrice : null} hint="For up to 2 adults; override per date in the calendar">
          <MoneyInput value={f.basePrice} onChange={(v) => set({ basePrice: v })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Extra adult / night">
            <MoneyInput value={f.extraAdultPrice} onChange={(v) => set({ extraAdultPrice: v ?? 0 })} />
          </Field>
          <Field label="Extra child / night">
            <MoneyInput value={f.extraChildPrice} onChange={(v) => set({ extraChildPrice: v ?? 0 })} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium text-ink">Inclusions</p>
          <StringListEditor label="Inclusion" value={f.inclusions} onChange={(v) => set({ inclusions: v })} placeholder="e.g. Welcome drink, Airport pickup" max={30} />
        </div>
        <div className="space-y-3 sm:col-span-2">
          <Toggle label="Refundable" description="Non-refundable plans are usually priced lower" checked={f.isRefundable} onChange={(v) => set({ isRefundable: v })} />
          {f.isRefundable && (
            <>
              <Checkbox label="Use a different cancellation policy than the property" checked={f.override} onChange={(e) => set({ override: e.target.checked })} />
              {f.override ? (
                <>
                  <CancellationPolicyEditor value={f.cancellationPolicy} onChange={(p) => set({ cancellationPolicy: p })} idPrefix="rp-cp" />
                  {touched && errs.policy && <p className="text-xs text-danger">{errs.policy}</p>}
                </>
              ) : (
                <div className="rounded-lg bg-surface-2 px-3 py-2">
                  <p className="mb-1 text-xs text-muted">Property policy applies:</p>
                  <PolicySummary policy={propertyPolicy} />
                </div>
              )}
            </>
          )}
          <Toggle label="Active" description="Inactive plans are hidden from guests" checked={f.isActive} onChange={(v) => set({ isActive: v })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          Save rate plan
        </Button>
      </div>
    </form>
  );
}
