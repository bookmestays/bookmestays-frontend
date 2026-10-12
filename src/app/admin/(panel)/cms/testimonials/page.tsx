"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import type { AdminTestimonial } from "@/lib/panel-types";
import { Badge, Field, Input, Select, Textarea } from "@/components/ui";
import { Toggle } from "@/components/panel/inputs";
import { MediaUrlField } from "@/components/panel/media-field";
import { nullIfEmpty } from "@/components/panel/util";
import { CrudPage, FormActions, useCrudSave, type CrudFormProps } from "../../../_components/crud";

export default function TestimonialsPage() {
  return (
    <CrudPage<AdminTestimonial>
      path="/admin/testimonials"
      title="Testimonials"
      description="Guest stories shown in the “Loved by our guests” carousel on the homepage."
      breadcrumbs={[{ label: "CMS" }, { label: "Testimonials" }]}
      noun="testimonial"
      modalSize="lg"
      columns={[
        {
          key: "author",
          header: "Guest",
          cell: (t) => (
            <div>
              <p className="font-medium text-ink">{t.authorName}</p>
              <p className="text-xs text-muted">{[t.authorTitle, t.authorLocation].filter(Boolean).join(" · ") || "—"}</p>
            </div>
          ),
          sortValue: (t) => t.authorName,
        },
        { key: "quote", header: "Quote", cell: (t) => <p className="line-clamp-2 max-w-md text-sm text-ink-2">{t.quote}</p>, hideBelow: "md" },
        {
          key: "rating",
          header: "Rating",
          align: "right",
          cell: (t) => (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-ink">
              <Star className="size-3.5 fill-rating text-rating" aria-hidden /> {t.rating}
            </span>
          ),
          sortValue: (t) => t.rating,
        },
        {
          key: "status",
          header: "Status",
          cell: (t) => (
            <div className="flex flex-wrap gap-1">
              {t.isActive ? <Badge tone="success">Active</Badge> : <Badge>Hidden</Badge>}
              {t.isFeatured && <Badge tone="warning">Featured</Badge>}
            </div>
          ),
        },
        { key: "sort", header: "Order", cell: (t) => t.sort, align: "right", sortValue: (t) => t.sort, hideBelow: "sm" },
      ]}
      Form={TestimonialForm}
    />
  );
}

function TestimonialForm({ item, onCancel, onSaved }: CrudFormProps<AdminTestimonial>) {
  const { busy, save } = useCrudSave("/admin/testimonials", item?.id, onSaved, "Testimonial saved");
  const [f, setF] = useState({
    authorName: item?.authorName ?? "",
    authorTitle: item?.authorTitle ?? "",
    authorLocation: item?.authorLocation ?? "",
    avatarUrl: item?.avatarUrl ?? null,
    quote: item?.quote ?? "",
    rating: item?.rating ?? 5,
    isActive: item?.isActive ?? true,
    isFeatured: item?.isFeatured ?? false,
    sort: item?.sort ?? 0,
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const [touched, setTouched] = useState(false);
  const nameErr = f.authorName.trim().length < 2 ? "Guest name is required" : null;
  const quoteErr = f.quote.trim().length < 4 ? "A quote is required" : null;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (nameErr || quoteErr) return;
        await save({
          authorName: f.authorName.trim(),
          authorTitle: nullIfEmpty(f.authorTitle),
          authorLocation: nullIfEmpty(f.authorLocation),
          avatarUrl: f.avatarUrl,
          quote: f.quote.trim(),
          rating: f.rating,
          isActive: f.isActive,
          isFeatured: f.isFeatured,
          sort: f.sort ?? 0,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Guest name" required error={touched ? nameErr : null}>
          <Input value={f.authorName} onChange={(e) => set({ authorName: e.target.value })} placeholder="e.g. Ananya Sharma" />
        </Field>
        <Field label="Rating">
          <Select value={String(f.rating)} onChange={(e) => set({ rating: Number(e.target.value) })}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n === 1 ? "" : "s"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Trip / title" hint="e.g. “Family holiday”">
          <Input value={f.authorTitle} onChange={(e) => set({ authorTitle: e.target.value })} />
        </Field>
        <Field label="Location" hint="e.g. “Mumbai”">
          <Input value={f.authorLocation} onChange={(e) => set({ authorLocation: e.target.value })} />
        </Field>
        <Field label="Quote" required error={touched ? quoteErr : null} className="sm:col-span-2">
          <Textarea rows={4} value={f.quote} onChange={(e) => set({ quote: e.target.value })} placeholder="What did the guest love about their stay?" />
        </Field>
        <div className="sm:col-span-2">
          <MediaUrlField kind="IMAGE" ownerType="TESTIMONIAL" ownerId={item?.id ?? null} label="Guest photo (optional)" value={f.avatarUrl} onChange={(u) => set({ avatarUrl: u })} />
        </div>
        <Toggle label="Active (visible on site)" checked={f.isActive} onChange={(v) => set({ isActive: v })} />
        <Toggle label="Featured (shown first)" checked={f.isFeatured} onChange={(v) => set({ isFeatured: v })} />
      </div>
      <FormActions busy={busy} onCancel={onCancel} label="Save testimonial" />
    </form>
  );
}
