"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/use-api";
import type { AdminCollection } from "@/lib/panel-types";
import { Badge, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { Tabs } from "@/components/panel/page";
import { NumberInput, Toggle } from "@/components/panel/inputs";
import { MediaUrlField } from "@/components/panel/media-field";
import { SeoFields } from "@/components/panel/seo-fields";
import { nullIfEmpty, slugify, useSiteMeta } from "@/components/panel/util";
import { CrudPage, FormActions, type CrudFormProps } from "../../../_components/crud";
import { PropertyPicker } from "../../../_components/property-picker";

export default function CollectionsPage() {
  return (
    <CrudPage<AdminCollection>
      path="/admin/collections"
      title="Collections"
      description="Curated lists like “Pool villas near Mumbai” or “Heritage stays in Rajasthan”."
      breadcrumbs={[{ label: "CMS" }, { label: "Collections" }]}
      noun="collection"
      modalSize="xl"
      columns={[
        {
          key: "title",
          header: "Collection",
          cell: (c) => (
            <div>
              <p className="font-medium text-ink">{c.title}</p>
              <p className="text-xs text-muted">/{c.slug}{c.citySlug ? ` · ${c.citySlug}` : ""}</p>
            </div>
          ),
          sortValue: (c) => c.title,
        },
        { key: "count", header: "Properties", cell: (c) => c.propertyCount, align: "right" },
        { key: "status", header: "Status", cell: (c) => (c.isActive ? <Badge tone="success">Active</Badge> : <Badge>Hidden</Badge>) },
        { key: "sort", header: "Order", cell: (c) => c.sort, align: "right", sortValue: (c) => c.sort, hideBelow: "sm" },
      ]}
      Form={CollectionForm}
    />
  );
}

function CollectionForm({ item, onCancel, onSaved }: CrudFormProps<AdminCollection>) {
  const toast = useToast();
  const meta = useSiteMeta();
  const [tab, setTab] = useState<"details" | "properties" | "seo">("details");
  const [f, setF] = useState({
    title: item?.title ?? "",
    slug: item?.slug ?? "",
    description: item?.description ?? "",
    cityId: item?.cityId ?? "",
    coverImageUrl: item?.coverImageUrl ?? null,
    sort: item?.sort ?? 0,
    isActive: item?.isActive ?? true,
    seo: item?.seo ?? {},
  });
  const [propertyIds, setPropertyIds] = useState<string[]>(item?.propertyIds ?? item?.properties?.map((p) => p.id) ?? []);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const titleErr = f.title.trim().length < 2 ? "Title is required" : null;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (titleErr) return setTab("details");
        setBusy(true);
        try {
          const saved = await api<AdminCollection>(item ? `/admin/collections/${item.id}` : "/admin/collections", {
            method: item ? "PATCH" : "POST",
            body: {
              title: f.title.trim(),
              slug: f.slug || slugify(f.title),
              description: nullIfEmpty(f.description),
              cityId: f.cityId || null,
              coverImageUrl: f.coverImageUrl,
              sort: f.sort ?? 0,
              isActive: f.isActive,
              seo: Object.keys(f.seo).length ? f.seo : null,
            },
          });
          await api(`/admin/collections/${item?.id ?? saved.id}/items`, { method: "PUT", body: { propertyIds } });
          toast.success("Collection saved");
          onSaved();
        } catch (err) {
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "details", label: "Details" },
          { key: "properties", label: `Properties (${propertyIds.length})` },
          { key: "seo", label: "SEO" },
        ]}
      />
      {tab === "details" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required error={touched ? titleErr : null}>
            <Input value={f.title} onChange={(e) => set({ title: e.target.value, ...(item ? {} : { slug: slugify(e.target.value) }) })} />
          </Field>
          <Field label="Slug">
            <Input value={f.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} className="font-mono" />
          </Field>
          <Field label="City" hint="Optional — shows the collection on that city's page">
            <Select value={f.cityId} onChange={(e) => set({ cityId: e.target.value })}>
              <option value="">All India</option>
              {meta.data?.cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Display order">
            <NumberInput value={f.sort} onChange={(v) => set({ sort: v ?? 0 })} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea rows={3} value={f.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <MediaUrlField kind="IMAGE" ownerType="COLLECTION" ownerId={item?.id ?? null} label="Cover image" value={f.coverImageUrl} onChange={(u) => set({ coverImageUrl: u })} />
          </div>
          <Toggle label="Active" checked={f.isActive} onChange={(v) => set({ isActive: v })} />
        </div>
      )}
      {tab === "properties" && <PropertyPicker value={propertyIds} onChange={setPropertyIds} label="Properties in this collection" />}
      {tab === "seo" && <SeoFields seo={f.seo} onChange={(seo) => set({ seo })} ownerType="COLLECTION" ownerId={item?.id ?? null} />}
      <FormActions busy={busy} onCancel={onCancel} label="Save collection" />
    </form>
  );
}
