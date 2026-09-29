"use client";

import { useState } from "react";
import { useApi } from "@/lib/use-api";
import { formatDate, formatINR } from "@/lib/format";
import type { AdminPropertyRow, Paginated } from "@/lib/types";
import type { Coupon } from "@/lib/panel-types";
import { Badge, Field, Input, Select, Textarea } from "@/components/ui";
import { MoneyInput, NumberInput, PercentInput, Toggle } from "@/components/panel/inputs";
import { fromLocalInput, nullIfEmpty, toLocalInput } from "@/components/panel/util";
import { useUrlParams } from "@/components/panel/url-state";
import { CrudPage, FormActions, useCrudSave, type CrudFormProps } from "../../_components/crud";

const discountLabel = (c: Coupon) => (c.type === "PERCENT" ? `${c.value / 100}%${c.maxDiscount ? ` (max ${formatINR(c.maxDiscount)})` : ""}` : formatINR(c.value));

export default function CouponsPage() {
  const { page, set } = useUrlParams();
  return (
    <CrudPage<Coupon>
      path="/admin/coupons"
      query={{ page, limit: 20 }}
      paginated
      onPage={(p) => set({ page: p })}
      title="Coupons"
      description="Discount codes guests enter at checkout."
      noun="coupon"
      columns={[
        {
          key: "code",
          header: "Code",
          cell: (c) => (
            <div>
              <p className="font-mono font-semibold text-ink">{c.code}</p>
              {c.description && <p className="line-clamp-1 text-xs text-muted">{c.description}</p>}
            </div>
          ),
          sortValue: (c) => c.code,
        },
        { key: "discount", header: "Discount", cell: discountLabel },
        { key: "funded", header: "Funded by", cell: (c) => <Badge tone={c.fundedBy === "PLATFORM" ? "brand" : "info"}>{c.fundedBy === "PLATFORM" ? "BookMeStays" : "Hotel"}</Badge>, hideBelow: "md" },
        { key: "scope", header: "Scope", cell: (c) => c.propertyName ?? (c.propertyId ? "One property" : "All properties"), hideBelow: "lg" },
        { key: "validity", header: "Valid", cell: (c) => <span className="text-xs whitespace-nowrap">{c.validFrom ? formatDate(c.validFrom) : "Now"} → {c.validTo ? formatDate(c.validTo) : "No end"}</span>, hideBelow: "md" },
        { key: "used", header: "Used", cell: (c) => `${c.usedCount}${c.usageLimit ? ` / ${c.usageLimit}` : ""}`, align: "right" },
        { key: "status", header: "Status", cell: (c) => (c.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>) },
      ]}
      Form={CouponForm}
    />
  );
}

function CouponForm({ item, onCancel, onSaved }: CrudFormProps<Coupon>) {
  const properties = useApi<Paginated<AdminPropertyRow>>("/admin/properties", { status: "LIVE", limit: 100 });
  const [f, setF] = useState({
    code: item?.code ?? "",
    description: item?.description ?? "",
    type: item?.type ?? ("PERCENT" as Coupon["type"]),
    value: item?.value ?? null,
    maxDiscount: item?.maxDiscount ?? null,
    minBookingAmount: item?.minBookingAmount ?? 0,
    validFrom: toLocalInput(item?.validFrom),
    validTo: toLocalInput(item?.validTo),
    usageLimit: item?.usageLimit ?? null,
    perUserLimit: item?.perUserLimit ?? 1,
    propertyId: item?.propertyId ?? "",
    fundedBy: item?.fundedBy ?? ("PLATFORM" as Coupon["fundedBy"]),
    isActive: item?.isActive ?? true,
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const [touched, setTouched] = useState(false);
  const { busy, save } = useCrudSave("/admin/coupons", item?.id, onSaved, "Coupon saved");
  const errs = {
    code: !/^[A-Z0-9_-]{3,40}$/.test(f.code) ? "3–40 chars: A–Z, 0–9, - or _" : null,
    value: !f.value ? "Enter the discount" : f.type === "PERCENT" && f.value > 10000 ? "Max 100%" : null,
    validTo: f.validFrom && f.validTo && f.validTo <= f.validFrom ? "Must be after start" : null,
    funded: f.fundedBy === "PARTNER" && !f.propertyId ? "Hotel-funded coupons must target one property" : null,
  };
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (Object.values(errs).some(Boolean)) return;
        await save({
          code: f.code,
          description: nullIfEmpty(f.description),
          type: f.type,
          value: f.value,
          maxDiscount: f.type === "PERCENT" ? f.maxDiscount : null,
          minBookingAmount: f.minBookingAmount ?? 0,
          validFrom: fromLocalInput(f.validFrom),
          validTo: fromLocalInput(f.validTo),
          usageLimit: f.usageLimit,
          perUserLimit: f.perUserLimit ?? 1,
          propertyId: f.propertyId || null,
          fundedBy: f.fundedBy,
          isActive: f.isActive,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" required error={touched ? errs.code : null}>
          <Input value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })} className="font-mono uppercase" />
        </Field>
        <Field label="Discount type">
          <Select value={f.type} onChange={(e) => set({ type: e.target.value as Coupon["type"], value: null })}>
            <option value="PERCENT">Percentage</option>
            <option value="FLAT">Flat amount</option>
          </Select>
        </Field>
        <Field label={f.type === "PERCENT" ? "Discount %" : "Discount amount"} required error={touched ? errs.value : null}>
          {f.type === "PERCENT" ? <PercentInput value={f.value} onChange={(v) => set({ value: v })} /> : <MoneyInput value={f.value} onChange={(v) => set({ value: v })} />}
        </Field>
        {f.type === "PERCENT" && (
          <Field label="Max discount" hint="Optional cap">
            <MoneyInput value={f.maxDiscount} onChange={(v) => set({ maxDiscount: v })} />
          </Field>
        )}
        <Field label="Minimum booking amount">
          <MoneyInput value={f.minBookingAmount} onChange={(v) => set({ minBookingAmount: v ?? 0 })} />
        </Field>
        <Field label="Funded by" error={touched ? errs.funded : null} hint="BookMeStays-funded discounts don't reduce the hotel payout">
          <Select value={f.fundedBy} onChange={(e) => set({ fundedBy: e.target.value as Coupon["fundedBy"] })}>
            <option value="PLATFORM">BookMeStays</option>
            <option value="PARTNER">Hotel (partner)</option>
          </Select>
        </Field>
        <Field label="Property" hint="Leave empty for all properties">
          <Select value={f.propertyId} onChange={(e) => set({ propertyId: e.target.value })}>
            <option value="">All properties</option>
            {properties.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valid from">
          <Input type="datetime-local" value={f.validFrom} onChange={(e) => set({ validFrom: e.target.value })} />
        </Field>
        <Field label="Valid until" error={touched ? errs.validTo : null}>
          <Input type="datetime-local" value={f.validTo} onChange={(e) => set({ validTo: e.target.value })} />
        </Field>
        <Field label="Total uses" hint="Empty = unlimited">
          <NumberInput min={1} value={f.usageLimit} onChange={(v) => set({ usageLimit: v })} />
        </Field>
        <Field label="Uses per guest">
          <NumberInput min={1} value={f.perUserLimit} onChange={(v) => set({ perUserLimit: v ?? 1 })} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea rows={2} value={f.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <Toggle label="Active" checked={f.isActive} onChange={(v) => set({ isActive: v })} />
      </div>
      <FormActions busy={busy} onCancel={onCancel} label="Save coupon" />
    </form>
  );
}
