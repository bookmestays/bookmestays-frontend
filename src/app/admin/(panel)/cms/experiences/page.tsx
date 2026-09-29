"use client";

import { useState } from "react";
import { formatINR } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { AdminPropertyRow, Paginated } from "@/lib/types";
import type { AdminExperience } from "@/lib/panel-types";
import { Badge, Field, Input, Select, Textarea } from "@/components/ui";
import { Tabs } from "@/components/panel/page";
import { MoneyInput, NumberInput, StringListEditor, Toggle } from "@/components/panel/inputs";
import { MediaUrlField } from "@/components/panel/media-field";
import { MediaManager } from "@/components/panel/media-manager";
import { SeoFields } from "@/components/panel/seo-fields";
import { nullIfEmpty, slugify, useSiteMeta } from "@/components/panel/util";
import { useUrlParams } from "@/components/panel/url-state";
import { CrudPage, FormActions, useCrudSave, type CrudFormProps } from "../../../_components/crud";

export default function ExperiencesPage() {
  const { page, set } = useUrlParams();
  return (
    <CrudPage<AdminExperience>
      path="/admin/experiences"
      query={{ page, limit: 20 }}
      paginated
      onPage={(p) => set({ page: p })}
      title="Experiences"
      description="Local experiences shown on city pages, property pages and the homepage."
      breadcrumbs={[{ label: "CMS" }, { label: "Experiences" }]}
      noun="experience"
      modalSize="xl"
      columns={[
        {
          key: "title",
          header: "Experience",
          cell: (x) => (
            <div>
              <p className="font-medium text-ink">{x.title}</p>
              <p className="text-xs text-muted">{x.cityName ?? "—"}{x.propertyName ? ` · ${x.propertyName}` : ""}</p>
            </div>
          ),
          sortValue: (x) => x.title,
        },
        { key: "duration", header: "Duration", cell: (x) => (x.durationMinutes ? `${Math.round(x.durationMinutes / 6) / 10} h` : "—"), hideBelow: "sm" },
        { key: "price", header: "Price", cell: (x) => formatINR(x.price), align: "right", sortValue: (x) => x.price },
        { key: "status", header: "Status", cell: (x) => (x.isActive ? <Badge tone="success">Active</Badge> : <Badge>Hidden</Badge>) },
      ]}
      Form={ExperienceForm}
    />
  );
}

function ExperienceForm({ item, onCancel, onSaved }: CrudFormProps<AdminExperience>) {
  const meta = useSiteMeta();
  const properties = useApi<Paginated<AdminPropertyRow>>("/admin/properties", { status: "LIVE", limit: 100 });
  const [tab, setTab] = useState<"details" | "media" | "seo">("details");
  const [f, setF] = useState({
    title: item?.title ?? "",
    slug: item?.slug ?? "",
    cityId: item?.cityId ?? "",
    propertyId: item?.propertyId ?? "",
    shortDescription: item?.shortDescription ?? "",
    story: item?.story ?? "",
    location: item?.location ?? "",
    meetingPoint: item?.meetingPoint ?? "",
    lat: item?.lat != null ? String(item.lat) : "",
    lng: item?.lng != null ? String(item.lng) : "",
    durationMinutes: item?.durationMinutes ?? null,
    price: item?.price ?? null,
    suitableFor: item?.suitableFor ?? [],
    included: item?.included ?? [],
    excluded: item?.excluded ?? [],
    hostName: item?.hostName ?? "",
    hostInfo: item?.hostInfo ?? "",
    availabilityNote: item?.availabilityNote ?? "",
    coverImageUrl: item?.coverImageUrl ?? null,
    isActive: item?.isActive ?? true,
    sort: item?.sort ?? 0,
    seo: item?.seo ?? {},
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const [touched, setTouched] = useState(false);
  const { busy, save } = useCrudSave("/admin/experiences", item?.id, onSaved, "Experience saved");
  const errs = { title: f.title.trim().length < 2 ? "Title is required" : null, cityId: !f.cityId ? "Choose a city" : null };

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (errs.title || errs.cityId) return setTab("details");
        await save({
          title: f.title.trim(),
          slug: f.slug || slugify(f.title),
          cityId: f.cityId,
          propertyId: f.propertyId || null,
          shortDescription: nullIfEmpty(f.shortDescription),
          story: nullIfEmpty(f.story),
          location: nullIfEmpty(f.location),
          meetingPoint: nullIfEmpty(f.meetingPoint),
          lat: f.lat ? Number(f.lat) : null,
          lng: f.lng ? Number(f.lng) : null,
          durationMinutes: f.durationMinutes,
          price: f.price,
          suitableFor: f.suitableFor,
          included: f.included,
          excluded: f.excluded,
          hostName: nullIfEmpty(f.hostName),
          hostInfo: nullIfEmpty(f.hostInfo),
          availabilityNote: nullIfEmpty(f.availabilityNote),
          coverImageUrl: f.coverImageUrl,
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
          { key: "media", label: "Photos & videos", hidden: !item },
          { key: "seo", label: "SEO" },
        ]}
      />
      {tab === "details" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required error={touched ? errs.title : null} className="sm:col-span-2">
            <Input value={f.title} onChange={(e) => set({ title: e.target.value, ...(item ? {} : { slug: slugify(e.target.value) }) })} />
          </Field>
          <Field label="Slug">
            <Input value={f.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} className="font-mono" />
          </Field>
          <Field label="City" required error={touched ? errs.cityId : null}>
            <Select value={f.cityId} onChange={(e) => set({ cityId: e.target.value })}>
              <option value="">Select city</option>
              {meta.data?.cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Linked property" hint="Optional — shows on that property's page">
            <Select value={f.propertyId} onChange={(e) => set({ propertyId: e.target.value })}>
              <option value="">None</option>
              {properties.data?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Duration (minutes)">
              <NumberInput min={0} value={f.durationMinutes} onChange={(v) => set({ durationMinutes: v })} />
            </Field>
            <Field label="Price / person">
              <MoneyInput value={f.price} onChange={(v) => set({ price: v })} />
            </Field>
          </div>
          <Field label="Short description" className="sm:col-span-2" hint={`${f.shortDescription.length}/300`}>
            <Textarea rows={2} maxLength={300} value={f.shortDescription} onChange={(e) => set({ shortDescription: e.target.value })} />
          </Field>
          <Field label="Story" className="sm:col-span-2">
            <Textarea rows={5} value={f.story} onChange={(e) => set({ story: e.target.value })} />
          </Field>
          <Field label="Location">
            <Input value={f.location} onChange={(e) => set({ location: e.target.value })} />
          </Field>
          <Field label="Meeting point">
            <Input value={f.meetingPoint} onChange={(e) => set({ meetingPoint: e.target.value })} />
          </Field>
          <Field label="Latitude">
            <Input inputMode="decimal" value={f.lat} onChange={(e) => set({ lat: e.target.value })} />
          </Field>
          <Field label="Longitude">
            <Input inputMode="decimal" value={f.lng} onChange={(e) => set({ lng: e.target.value })} />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium">Suitable for</p>
            <StringListEditor label="Suitable for" value={f.suitableFor} onChange={(v) => set({ suitableFor: v })} placeholder="Families, couples…" />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Included</p>
            <StringListEditor label="Included" value={f.included} onChange={(v) => set({ included: v })} placeholder="Guide, snacks…" />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Not included</p>
            <StringListEditor label="Excluded" value={f.excluded} onChange={(v) => set({ excluded: v })} placeholder="Transport…" />
          </div>
          <Field label="Availability note">
            <Textarea rows={2} value={f.availabilityNote} onChange={(e) => set({ availabilityNote: e.target.value })} placeholder="Daily 6–9 AM, Oct–May" />
          </Field>
          <Field label="Host name">
            <Input value={f.hostName} onChange={(e) => set({ hostName: e.target.value })} />
          </Field>
          <Field label="About the host">
            <Textarea rows={2} value={f.hostInfo} onChange={(e) => set({ hostInfo: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <MediaUrlField kind="IMAGE" ownerType="EXPERIENCE" ownerId={item?.id ?? null} label="Cover image" value={f.coverImageUrl} onChange={(u) => set({ coverImageUrl: u })} />
          </div>
          <Field label="Display order">
            <NumberInput value={f.sort} onChange={(v) => set({ sort: v ?? 0 })} />
          </Field>
          <Toggle label="Active" checked={f.isActive} onChange={(v) => set({ isActive: v })} />
        </div>
      )}
      {tab === "media" && item && <MediaManager ownerType="EXPERIENCE" ownerId={item.id} tags={["EXPERIENCE", "SURROUNDINGS", "VIEW", "OTHER"]} defaultTag="EXPERIENCE" />}
      {tab === "seo" && <SeoFields seo={f.seo} onChange={(seo) => set({ seo })} ownerType="EXPERIENCE" ownerId={item?.id ?? null} />}
      <FormActions busy={busy} onCancel={onCancel} label="Save experience" />
    </form>
  );
}
