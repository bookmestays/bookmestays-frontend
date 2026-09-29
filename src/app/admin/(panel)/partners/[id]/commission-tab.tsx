"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import type { CommissionRule, CommissionType, PartnerDetail, PartnerPropertyDetail } from "@/lib/types";
import { Badge, Button, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { DataTable } from "@/components/panel/data-table";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { CommissionInput } from "@/components/panel/inputs";
import { commissionLabel } from "@/components/panel/labels";
import { Section } from "@/components/panel/page";
import { todayISO } from "@/components/panel/util";

export function CommissionTab({ partner, onChanged }: { partner: PartnerDetail; onChanged: () => void }) {
  const toast = useToast();
  const rules = useApi<CommissionRule[]>(`/admin/partners/${partner.id}/commission-rules`);
  const [editing, setEditing] = useState<CommissionRule | "new" | null>(null);
  const [deleting, setDeleting] = useState<CommissionRule | null>(null);
  const rows = rules.data ?? partner.commissionRules;

  const scope = (r: CommissionRule) =>
    r.roomTypeId ? (
      <div>
        <Badge tone="brand">Room type</Badge>
        <p className="mt-0.5 text-sm text-ink">{r.roomTypeName}</p>
        <p className="text-xs text-muted">{r.propertyName}</p>
      </div>
    ) : r.propertyId ? (
      <div>
        <Badge tone="info">Property</Badge>
        <p className="mt-0.5 text-sm text-ink">{r.propertyName}</p>
      </div>
    ) : (
      <Badge>Partner</Badge>
    );

  return (
    <div className="space-y-4">
      <Section title="How commission is applied">
        <p className="text-sm text-ink-2">
          The most specific active rule wins: <strong>room type rule</strong> → <strong>property rule</strong> → partner default (
          <strong>{commissionLabel(partner.defaultCommissionType, partner.defaultCommissionValue)}</strong>). Percentages apply to the room amount; flat fees are per room-night. Commission is snapshotted on each booking.
        </p>
      </Section>
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")} disabled={partner.properties.length === 0} title={partner.properties.length === 0 ? "Partner has no properties yet" : undefined}>
          <Plus className="size-4" /> Add rule
        </Button>
      </div>
      <DataTable<CommissionRule>
        rows={rows}
        rowKey={(r) => r.id}
        loading={rules.loading}
        error={rules.error}
        onRetry={rules.refetch}
        columns={[
          { key: "scope", header: "Applies to", cell: scope },
          { key: "value", header: "Commission", cell: (r) => <span className="font-medium text-ink">{commissionLabel(r.type, r.value)}</span>, sortValue: (r) => r.value },
          {
            key: "dates",
            header: "Effective",
            cell: (r) => (
              <span className="whitespace-nowrap text-xs">
                {formatDate(r.effectiveFrom)} → {r.effectiveTo ? formatDate(r.effectiveTo) : "no end"}
              </span>
            ),
            sortValue: (r) => r.effectiveFrom,
          },
          { key: "notes", header: "Notes", cell: (r) => <span className="line-clamp-2 text-xs">{r.notes ?? "—"}</span>, hideBelow: "md" },
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right",
            cell: (r) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(r)} aria-label="Edit rule">
                  <Pencil className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(r)} aria-label="Delete rule" className="hover:text-danger">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ),
          },
        ]}
        empty={{ title: "No overrides", description: "All bookings use the partner default commission." }}
      />
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New commission rule" : "Edit commission rule"}>
        {editing && (
          <RuleForm
            partner={partner}
            rule={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              rules.refetch();
              onChanged();
            }}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete rule?"
        description="Future bookings will fall back to the next applicable rule. Existing bookings keep their snapshotted commission."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => {
          await api(`/admin/commission-rules/${deleting?.id}`, { method: "DELETE" });
          toast.success("Rule deleted");
          rules.refetch();
          onChanged();
        }}
      />
    </div>
  );
}

function RuleForm({ partner, rule, onCancel, onSaved }: { partner: PartnerDetail; rule: CommissionRule | null; onCancel: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [propertyId, setPropertyId] = useState(rule?.propertyId ?? "");
  const [roomTypeId, setRoomTypeId] = useState(rule?.roomTypeId ?? "");
  const [type, setType] = useState<CommissionType>(rule?.type ?? partner.defaultCommissionType);
  const [value, setValue] = useState<number | null>(rule?.value ?? null);
  const [from, setFrom] = useState(rule?.effectiveFrom?.slice(0, 10) ?? todayISO());
  const [to, setTo] = useState(rule?.effectiveTo?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(rule?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const property = useApi<PartnerPropertyDetail>(propertyId ? `/admin/properties/${propertyId}` : null);
  const roomTypes = property.data?.id === propertyId ? property.data.roomTypes : [];

  const errs = {
    property: !rule && !propertyId ? "Choose a property" : null,
    value: value == null ? "Enter the commission" : type === "PERCENT" && value > 10000 ? "Max 100%" : null,
    to: to && to < from ? "End date must be after start" : null,
  };

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (errs.property || errs.value || errs.to) return;
        setBusy(true);
        try {
          if (rule) {
            await api(`/admin/commission-rules/${rule.id}`, { method: "PATCH", body: { type, value, effectiveFrom: from, effectiveTo: to || null, notes: notes.trim() || null } });
          } else {
            await api(`/admin/partners/${partner.id}/commission-rules`, {
              method: "POST",
              body: { propertyId, roomTypeId: roomTypeId || null, type, value, effectiveFrom: from || undefined, effectiveTo: to || null, notes: notes.trim() || undefined },
            });
          }
          toast.success("Commission rule saved");
          onSaved();
        } catch (err) {
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      {rule ? (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
          {rule.roomTypeName ? `${rule.roomTypeName} · ` : ""}
          {rule.propertyName ?? "Partner-wide"}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Property" required error={touched ? errs.property : null}>
            <Select
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setRoomTypeId("");
              }}
            >
              <option value="">Select property</option>
              {partner.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Room type" hint="Leave as “All room types” for a property-wide rule">
            <Select value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)} disabled={!propertyId || property.loading}>
              <option value="">{property.loading ? "Loading…" : "All room types"}</option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                  {rt.status === "PENDING_APPROVAL" ? " (pending)" : ""}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
      <Field label="Commission" required error={touched ? errs.value : null}>
        <CommissionInput
          type={type}
          value={value}
          onChange={(v) => {
            setType(v.type);
            setValue(v.value);
          }}
          invalid={touched && !!errs.value}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Effective from">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Effective to" hint="Optional" error={touched ? errs.to : null}>
          <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Launch offer for suites" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          Save rule
        </Button>
      </div>
    </form>
  );
}
