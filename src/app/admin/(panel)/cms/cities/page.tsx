"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import type { Area } from "@/lib/types";
import type { AdminCity } from "@/lib/panel-types";
import { Badge, Button, Checkbox, Field, Input, Textarea, useToast } from "@/components/ui";
import { Tabs } from "@/components/panel/page";
import { NumberInput, Toggle } from "@/components/panel/inputs";
import { MediaUrlField } from "@/components/panel/media-field";
import { SeoFields } from "@/components/panel/seo-fields";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { asList, nullIfEmpty, slugify } from "@/components/panel/util";
import { CrudPage, FormActions, useCrudSave, type CrudFormProps } from "../../../_components/crud";

export default function CitiesPage() {
  return (
    <CrudPage<AdminCity>
      path="/admin/cities"
      title="Cities & areas"
      description="Destinations shown in search, city pages and the homepage."
      breadcrumbs={[{ label: "CMS" }, { label: "Cities" }]}
      noun="city"
      deleteWarning="Cities with properties can't be deleted — deactivate them instead."
      columns={[
        {
          key: "name",
          header: "City",
          cell: (c) => (
            <div>
              <p className="font-medium text-ink">{c.name}</p>
              <p className="text-xs text-muted">
                /{c.slug}
                {c.state ? ` · ${c.state}` : ""}
              </p>
            </div>
          ),
          sortValue: (c) => c.name,
        },
        { key: "props", header: "Properties", cell: (c) => c.propertyCount ?? "—", align: "right", hideBelow: "sm" },
        { key: "flags", header: "Flags", cell: (c) => <div className="flex gap-1">{c.isFeatured && <Badge tone="brand">Featured</Badge>}{!c.isActive && <Badge>Inactive</Badge>}</div> },
        { key: "sort", header: "Order", cell: (c) => c.sort, align: "right", sortValue: (c) => c.sort, hideBelow: "md" },
      ]}
      Form={CityForm}
      modalSize="xl"
    />
  );
}

function CityForm({ item, onCancel, onSaved }: CrudFormProps<AdminCity>) {
  const [tab, setTab] = useState<"details" | "areas" | "seo">("details");
  const [f, setF] = useState({
    name: item?.name ?? "",
    slug: item?.slug ?? "",
    state: item?.state ?? "",
    intro: item?.intro ?? "",
    travelInfo: item?.travelInfo ?? "",
    foodGuide: item?.foodGuide ?? "",
    lat: item?.lat != null ? String(item.lat) : "",
    lng: item?.lng != null ? String(item.lng) : "",
    coverImageUrl: item?.coverImageUrl ?? null,
    isFeatured: item?.isFeatured ?? false,
    isActive: item?.isActive ?? true,
    sort: item?.sort ?? 0,
    seo: item?.seo ?? {},
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const [touched, setTouched] = useState(false);
  const { busy, save } = useCrudSave("/admin/cities", item?.id, onSaved, "City saved");
  const errs = { name: f.name.trim().length < 2 ? "Name is required" : null, slug: f.slug && slugify(f.slug) !== f.slug ? "lowercase-with-hyphens" : null };

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (errs.name || errs.slug) return setTab("details");
        await save({
          name: f.name.trim(),
          slug: f.slug || slugify(f.name),
          state: nullIfEmpty(f.state),
          intro: nullIfEmpty(f.intro),
          travelInfo: nullIfEmpty(f.travelInfo),
          foodGuide: nullIfEmpty(f.foodGuide),
          lat: f.lat ? Number(f.lat) : null,
          lng: f.lng ? Number(f.lng) : null,
          coverImageUrl: f.coverImageUrl,
          isFeatured: f.isFeatured,
          isActive: f.isActive,
          sort: f.sort ?? 0,
          seo: Object.keys(f.seo).length ? f.seo : null,
        });
      }}
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "details", label: "Details" },
          { key: "areas", label: "Areas", hidden: !item },
          { key: "seo", label: "SEO" },
        ]}
      />
      {tab === "details" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required error={touched ? errs.name : null}>
            <Input value={f.name} onChange={(e) => set({ name: e.target.value, ...(item ? {} : { slug: slugify(e.target.value) }) })} />
          </Field>
          <Field label="Slug" error={errs.slug} hint="Used in /cities/slug URLs">
            <Input value={f.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} className="font-mono" />
          </Field>
          <Field label="State">
            <Input value={f.state} onChange={(e) => set({ state: e.target.value })} />
          </Field>
          <Field label="Display order">
            <NumberInput value={f.sort} onChange={(v) => set({ sort: v ?? 0 })} />
          </Field>
          <Field label="Latitude">
            <Input inputMode="decimal" value={f.lat} onChange={(e) => set({ lat: e.target.value })} />
          </Field>
          <Field label="Longitude">
            <Input inputMode="decimal" value={f.lng} onChange={(e) => set({ lng: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <MediaUrlField kind="IMAGE" ownerType="CITY" ownerId={item?.id ?? null} label="Cover image" value={f.coverImageUrl} onChange={(u) => set({ coverImageUrl: u })} />
          </div>
          <Field label="Intro" className="sm:col-span-2">
            <Textarea rows={3} value={f.intro} onChange={(e) => set({ intro: e.target.value })} />
          </Field>
          <Field label="Travel info" className="sm:col-span-2">
            <Textarea rows={3} value={f.travelInfo} onChange={(e) => set({ travelInfo: e.target.value })} />
          </Field>
          <Field label="Food guide" className="sm:col-span-2">
            <Textarea rows={3} value={f.foodGuide} onChange={(e) => set({ foodGuide: e.target.value })} />
          </Field>
          <Toggle label="Featured city" description="Shown in the homepage Cities section" checked={f.isFeatured} onChange={(v) => set({ isFeatured: v })} />
          <Toggle label="Active" description="Inactive cities are hidden from guests" checked={f.isActive} onChange={(v) => set({ isActive: v })} />
        </div>
      )}
      {tab === "areas" && item && <AreasEditor cityId={item.id} />}
      {tab === "seo" && <SeoFields seo={f.seo} onChange={(seo) => set({ seo })} ownerType="CITY" ownerId={item?.id ?? null} />}
      {tab !== "areas" && <FormActions busy={busy} onCancel={onCancel} label="Save city" />}
    </form>
  );
}

function AreasEditor({ cityId }: { cityId: string }) {
  const toast = useToast();
  const path = `/admin/cities/${cityId}/areas`;
  const { data, loading, refetch } = useApi<Area[] | { items: Area[] }>(path);
  const areas = asList(data);
  const [edit, setEdit] = useState<{ id?: string; name: string; description: string; isRecommended: boolean } | null>(null);
  const [deleting, setDeleting] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!edit || edit.name.trim().length < 2) return toast.error("Area name is required");
    setBusy(true);
    try {
      const body = { name: edit.name.trim(), slug: slugify(edit.name), description: nullIfEmpty(edit.description), isRecommended: edit.isRecommended };
      await api(edit.id ? `${path}/${edit.id}` : path, { method: edit.id ? "PATCH" : "POST", body });
      setEdit(null);
      refetch();
      toast.success("Area saved");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {loading && !data ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : areas.length === 0 ? (
        <p className="text-sm text-muted">No areas yet. Add neighbourhoods like “Calangute” or “Old Goa”.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {areas.map((a) => (
            <li key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="flex-1">
                <span className="font-medium text-ink">{a.name}</span>
                {a.isRecommended && <Badge tone="brand" className="ml-2">Recommended</Badge>}
                {a.description && <span className="block text-xs text-muted">{a.description}</span>}
              </span>
              <Button size="sm" variant="ghost" aria-label="Edit area" onClick={() => setEdit({ id: a.id, name: a.name, description: a.description ?? "", isRecommended: a.isRecommended })}>
                <Pencil className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" aria-label="Delete area" className="hover:text-danger" onClick={() => setDeleting(a)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {edit ? (
        <div className="space-y-3 rounded-lg bg-surface-2 p-3">
          <Field label="Area name" required>
            <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus />
          </Field>
          <Field label="Description">
            <Textarea rows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          </Field>
          <Checkbox label="Recommended area" checked={edit.isRecommended} onChange={(e) => setEdit({ ...edit, isRecommended: e.target.checked })} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button size="sm" loading={busy} onClick={submit}>
              Save area
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setEdit({ name: "", description: "", isRecommended: false })}>
          <Plus className="size-4" /> Add area
        </Button>
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete area?"
        tone="danger"
        confirmLabel="Delete"
        onConfirm={async () => {
          await api(`${path}/${deleting?.id}`, { method: "DELETE" });
          refetch();
        }}
      />
    </div>
  );
}
