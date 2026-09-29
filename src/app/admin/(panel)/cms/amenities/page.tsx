"use client";

import { useState } from "react";
import type { AdminAmenity } from "@/lib/panel-types";
import { Badge, Field, Input, Select } from "@/components/ui";
import { NumberInput } from "@/components/panel/inputs";
import { CrudPage, FormActions, useCrudSave, type CrudFormProps } from "../../../_components/crud";

const SCOPES = { PROPERTY: "Property", ROOM: "Room", BOTH: "Property & room" } as const;

export default function AmenitiesPage() {
  return (
    <CrudPage<AdminAmenity>
      path="/admin/amenities"
      title="Amenities"
      description="Amenity master list that partners pick from. Icons use lucide icon names (e.g. wifi, waves, car)."
      breadcrumbs={[{ label: "CMS" }, { label: "Amenities" }]}
      noun="amenity"
      modalSize="md"
      deleteWarning="Removing an amenity also removes it from every property and room that uses it."
      columns={[
        { key: "name", header: "Amenity", cell: (a) => <span className="font-medium text-ink">{a.name}</span>, sortValue: (a) => a.name },
        { key: "code", header: "Code", cell: (a) => <span className="font-mono text-xs">{a.code}</span>, sortValue: (a) => a.code, hideBelow: "sm" },
        { key: "category", header: "Category", cell: (a) => a.category, sortValue: (a) => a.category },
        { key: "scope", header: "Applies to", cell: (a) => <Badge>{SCOPES[a.scope]}</Badge>, hideBelow: "sm" },
        { key: "icon", header: "Icon", cell: (a) => <span className="text-xs text-muted">{a.icon ?? "—"}</span>, hideBelow: "md" },
      ]}
      Form={AmenityForm}
    />
  );
}

function AmenityForm({ item, onCancel, onSaved }: CrudFormProps<AdminAmenity>) {
  const [f, setF] = useState({ name: item?.name ?? "", code: item?.code ?? "", category: item?.category ?? "", icon: item?.icon ?? "", scope: item?.scope ?? "BOTH", sort: item?.sort ?? 0 });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const [touched, setTouched] = useState(false);
  const { busy, save } = useCrudSave("/admin/amenities", item?.id, onSaved, "Amenity saved");
  const errs = {
    name: f.name.trim().length < 2 ? "Name is required" : null,
    code: !/^[a-z0-9_]{2,40}$/.test(f.code) ? "lowercase_snake_case, 2–40 chars" : null,
    category: !f.category.trim() ? "Category is required" : null,
  };
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (errs.name || errs.code || errs.category) return;
        await save({ name: f.name.trim(), code: f.code, category: f.category.trim(), icon: f.icon.trim() || null, scope: f.scope, sort: f.sort ?? 0 });
      }}
    >
      <Field label="Name" required error={touched ? errs.name : null}>
        <Input value={f.name} onChange={(e) => set({ name: e.target.value, ...(item ? {} : { code: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") }) })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" required error={touched ? errs.code : null} hint="Used in search filters">
          <Input value={f.code} onChange={(e) => set({ code: e.target.value })} className="font-mono" />
        </Field>
        <Field label="Category" required error={touched ? errs.category : null}>
          <Input value={f.category} onChange={(e) => set({ category: e.target.value })} placeholder="Popular, Bathroom, Outdoors…" />
        </Field>
        <Field label="Icon">
          <Input value={f.icon} onChange={(e) => set({ icon: e.target.value })} placeholder="wifi" />
        </Field>
        <Field label="Applies to">
          <Select value={f.scope} onChange={(e) => set({ scope: e.target.value as AdminAmenity["scope"] })}>
            {Object.entries(SCOPES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Display order">
          <NumberInput value={f.sort} onChange={(v) => set({ sort: v ?? 0 })} />
        </Field>
      </div>
      <FormActions busy={busy} onCancel={onCancel} label="Save amenity" />
    </form>
  );
}
