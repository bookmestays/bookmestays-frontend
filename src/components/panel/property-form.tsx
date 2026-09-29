"use client";

import { useApi } from "@/lib/use-api";
import {
  PROPERTY_TYPE_LABELS,
  TRAVEL_TAG_LABELS,
  type Amenity,
  type CancellationPolicy,
  type CityLite,
  type CityPage,
  type PartnerPropertyDetail,
  type PropertyType,
  type TravelTag,
} from "@/lib/types";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { CancellationPolicyEditor, validatePolicy } from "./cancellation-policy-editor";
import { StringListEditor } from "./inputs";
import { EMAIL_RE, nullIfEmpty } from "./util";

export type PropertyFormState = {
  name: string;
  type: PropertyType;
  travelTags: TravelTag[];
  starRating: string;
  shortDescription: string;
  description: string;
  highlights: string[];
  foodAndDining: string;
  contactPhone: string;
  contactEmail: string;
  cityId: string;
  areaId: string;
  address: string;
  pincode: string;
  lat: string;
  lng: string;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: CancellationPolicy | null;
  houseRules: string[];
  terms: string;
};
export type PropertyFormErrors = Partial<Record<keyof PropertyFormState, string>>;

export const propertyFormFromDetail = (p: PartnerPropertyDetail): PropertyFormState => ({
  name: p.name,
  type: p.type,
  travelTags: p.travelTags ?? [],
  starRating: p.starRating ? String(p.starRating) : "",
  shortDescription: p.shortDescription ?? "",
  description: p.description ?? "",
  highlights: p.highlights ?? [],
  foodAndDining: p.foodAndDining ?? "",
  contactPhone: p.contactPhone ?? "",
  contactEmail: p.contactEmail ?? "",
  cityId: p.cityId ?? p.city?.id ?? "",
  areaId: p.areaId ?? p.area?.id ?? "",
  address: p.address ?? "",
  pincode: p.pincode ?? "",
  lat: p.lat != null ? String(p.lat) : "",
  lng: p.lng != null ? String(p.lng) : "",
  checkInTime: p.checkInTime?.slice(0, 5) ?? "",
  checkOutTime: p.checkOutTime?.slice(0, 5) ?? "",
  cancellationPolicy: p.cancellationPolicy,
  houseRules: p.houseRules ?? [],
  terms: p.terms ?? "",
});

export const DETAIL_FIELDS: (keyof PropertyFormState)[] = ["name", "type", "travelTags", "starRating", "shortDescription", "description", "highlights", "foodAndDining", "contactPhone", "contactEmail"];
export const LOCATION_FIELDS: (keyof PropertyFormState)[] = ["cityId", "areaId", "address", "pincode", "lat", "lng"];
export const POLICY_FIELDS: (keyof PropertyFormState)[] = ["checkInTime", "checkOutTime", "cancellationPolicy", "houseRules", "terms"];

export function validatePropertyForm(s: PropertyFormState): PropertyFormErrors {
  const e: PropertyFormErrors = {};
  if (s.name.trim().length < 2) e.name = "Name is required";
  if (s.shortDescription.length > 300) e.shortDescription = "Keep it under 300 characters";
  if (s.contactEmail.trim() && !EMAIL_RE.test(s.contactEmail.trim())) e.contactEmail = "Enter a valid email";
  if (s.contactPhone.trim() && !/^\+?[0-9 -]{8,16}$/.test(s.contactPhone.trim())) e.contactPhone = "Enter a valid phone";
  if (s.pincode.trim() && !/^\d{6}$/.test(s.pincode.trim())) e.pincode = "6-digit PIN code";
  if (s.lat.trim() && (isNaN(Number(s.lat)) || Math.abs(Number(s.lat)) > 90)) e.lat = "Latitude −90…90";
  if (s.lng.trim() && (isNaN(Number(s.lng)) || Math.abs(Number(s.lng)) > 180)) e.lng = "Longitude −180…180";
  const pe = validatePolicy(s.cancellationPolicy);
  if (pe) e.cancellationPolicy = pe;
  return e;
}

export function propertyPayload(s: PropertyFormState) {
  return {
    name: s.name.trim(),
    type: s.type,
    travelTags: s.travelTags,
    starRating: s.starRating ? Number(s.starRating) : null,
    shortDescription: nullIfEmpty(s.shortDescription),
    description: nullIfEmpty(s.description),
    highlights: s.highlights.map((h) => h.trim()).filter(Boolean),
    foodAndDining: nullIfEmpty(s.foodAndDining),
    contactPhone: nullIfEmpty(s.contactPhone),
    contactEmail: nullIfEmpty(s.contactEmail),
    cityId: s.cityId || null,
    areaId: s.areaId || null,
    address: nullIfEmpty(s.address),
    pincode: nullIfEmpty(s.pincode),
    lat: s.lat.trim() ? Number(s.lat) : null,
    lng: s.lng.trim() ? Number(s.lng) : null,
    checkInTime: s.checkInTime || null,
    checkOutTime: s.checkOutTime || null,
    cancellationPolicy: s.cancellationPolicy,
    houseRules: s.houseRules.map((h) => h.trim()).filter(Boolean),
    terms: nullIfEmpty(s.terms),
  };
}

type Props = { s: PropertyFormState; set: (p: Partial<PropertyFormState>) => void; errors: PropertyFormErrors; readOnly?: boolean };

export function PropertyDetailsFields({ s, set, errors, readOnly }: Props) {
  return (
    <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
      <Field label="Property name" required error={errors.name} className="sm:col-span-2">
        <Input value={s.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Type" required>
        <Select value={s.type} onChange={(e) => set({ type: e.target.value as PropertyType })}>
          {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
            <option key={t} value={t}>
              {PROPERTY_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Star rating">
        <Select value={s.starRating} onChange={(e) => set({ starRating: e.target.value })}>
          <option value="">Not rated</option>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n} star
            </option>
          ))}
        </Select>
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-medium text-ink">Best for</legend>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(TRAVEL_TAG_LABELS) as TravelTag[]).map((t) => (
            <Checkbox
              key={t}
              label={TRAVEL_TAG_LABELS[t]}
              checked={s.travelTags.includes(t)}
              onChange={(e) => set({ travelTags: e.target.checked ? [...s.travelTags, t] : s.travelTags.filter((x) => x !== t) })}
            />
          ))}
        </div>
      </fieldset>
      <Field label="Short description" error={errors.shortDescription} hint={`${s.shortDescription.length}/300 — shown on listing cards`} className="sm:col-span-2">
        <Textarea rows={2} maxLength={300} value={s.shortDescription} onChange={(e) => set({ shortDescription: e.target.value })} />
      </Field>
      <Field label="Full description" className="sm:col-span-2">
        <Textarea rows={8} value={s.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>
      <div className="sm:col-span-2">
        <p className="mb-2 text-sm font-medium text-ink">Highlights</p>
        <StringListEditor label="Highlight" value={s.highlights} onChange={(v) => set({ highlights: v })} placeholder="e.g. Private infinity pool" max={20} />
      </div>
      <Field label="Food & dining" className="sm:col-span-2">
        <Textarea rows={4} value={s.foodAndDining} onChange={(e) => set({ foodAndDining: e.target.value })} />
      </Field>
      <Field label="Front desk phone" error={errors.contactPhone} hint="Shared with guests after booking">
        <Input type="tel" value={s.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} aria-invalid={!!errors.contactPhone} />
      </Field>
      <Field label="Front desk email" error={errors.contactEmail}>
        <Input type="email" value={s.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} aria-invalid={!!errors.contactEmail} />
      </Field>
    </fieldset>
  );
}

export function PropertyLocationFields({ s, set, errors, readOnly, cities }: Props & { cities: CityLite[] }) {
  const city = cities.find((c) => c.id === s.cityId);
  const cityPage = useApi<CityPage>(city ? `/public/cities/${city.slug}` : null);
  const areas = cityPage.data?.city.id === s.cityId ? cityPage.data.areas : [];
  const lat = Number(s.lat);
  const lng = Number(s.lng);
  const hasPoint = s.lat.trim() !== "" && s.lng.trim() !== "" && !errors.lat && !errors.lng && Number.isFinite(lat) && Number.isFinite(lng);
  const d = 0.01;
  return (
    <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
      <Field label="City" required>
        <Select value={s.cityId} onChange={(e) => set({ cityId: e.target.value, areaId: "" })}>
          <option value="">Select city</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.state ? `, ${c.state}` : ""}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Area / locality">
        <Select value={s.areaId} onChange={(e) => set({ areaId: e.target.value })} disabled={!s.cityId || cityPage.loading}>
          <option value="">{cityPage.loading ? "Loading…" : areas.length ? "Select area" : "No areas for this city"}</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Street address" required className="sm:col-span-2">
        <Textarea rows={2} value={s.address} onChange={(e) => set({ address: e.target.value })} />
      </Field>
      <Field label="PIN code" error={errors.pincode}>
        <Input inputMode="numeric" maxLength={6} value={s.pincode} onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, "") })} aria-invalid={!!errors.pincode} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Latitude" error={errors.lat}>
          <Input inputMode="decimal" value={s.lat} onChange={(e) => set({ lat: e.target.value.trim() })} placeholder="15.5527" aria-invalid={!!errors.lat} />
        </Field>
        <Field label="Longitude" error={errors.lng}>
          <Input inputMode="decimal" value={s.lng} onChange={(e) => set({ lng: e.target.value.trim() })} placeholder="73.7517" aria-invalid={!!errors.lng} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        {hasPoint ? (
          <div className="space-y-1">
            <iframe
              title="Map preview"
              className="h-64 w-full rounded-lg border border-line"
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`}
            />
            <a className="text-xs text-brand hover:underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}>
              Open larger map
            </a>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-muted">
            Enter latitude & longitude to preview the pin. Tip: right-click the spot in Google Maps / OpenStreetMap and copy the coordinates.
          </p>
        )}
      </div>
    </fieldset>
  );
}

export function PropertyPolicyFields({ s, set, errors, readOnly }: Props) {
  return (
    <fieldset disabled={readOnly} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Check-in time">
          <Input type="time" value={s.checkInTime} onChange={(e) => set({ checkInTime: e.target.value })} />
        </Field>
        <Field label="Check-out time">
          <Input type="time" value={s.checkOutTime} onChange={(e) => set({ checkOutTime: e.target.value })} />
        </Field>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Cancellation policy</h3>
        <CancellationPolicyEditor value={s.cancellationPolicy} onChange={(p) => set({ cancellationPolicy: p })} idPrefix="property-cp" />
        {errors.cancellationPolicy && <p className="mt-1 text-xs text-danger">{errors.cancellationPolicy}</p>}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">House rules</h3>
        <StringListEditor label="House rule" value={s.houseRules} onChange={(v) => set({ houseRules: v })} placeholder="e.g. No loud music after 10 PM" max={40} />
      </div>
      <Field label="Terms & conditions">
        <Textarea rows={6} value={s.terms} onChange={(e) => set({ terms: e.target.value })} />
      </Field>
    </fieldset>
  );
}

/** Grouped amenity checkboxes. */
export function AmenitiesPicker({ amenities, value, onChange, scope, disabled }: { amenities: Amenity[]; value: string[]; onChange: (ids: string[]) => void; scope: "PROPERTY" | "ROOM"; disabled?: boolean }) {
  const list = amenities.filter((a) => a.scope === scope || a.scope === "BOTH");
  const groups = new Map<string, Amenity[]>();
  for (const a of list) groups.set(a.category || "Other", [...(groups.get(a.category || "Other") ?? []), a]);
  if (!list.length) return <p className="text-sm text-muted">No amenities configured yet.</p>;
  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([cat, items]) => (
        <fieldset key={cat} disabled={disabled}>
          <legend className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{cat}</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <Checkbox key={a.id} label={a.name} checked={value.includes(a.id)} onChange={(e) => onChange(e.target.checked ? [...value, a.id] : value.filter((x) => x !== a.id))} />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
