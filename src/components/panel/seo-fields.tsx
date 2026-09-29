"use client";

import type { MediaOwnerType, Seo } from "@/lib/types";
import { Field, Input, Textarea } from "@/components/ui";
import { ChipsInput } from "./inputs";
import { MediaUrlField } from "./media-field";

export function SeoFields({ seo, onChange, ownerType, ownerId }: { seo: Seo; onChange: (s: Seo) => void; ownerType: MediaOwnerType; ownerId: string | null }) {
  return (
    <div className="grid gap-4">
      <Field label="Meta title" hint={`${(seo.title ?? "").length}/60 recommended`}>
        <Input value={seo.title ?? ""} maxLength={200} onChange={(e) => onChange({ ...seo, title: e.target.value || undefined })} />
      </Field>
      <Field label="Meta description" hint={`${(seo.description ?? "").length}/160 recommended`}>
        <Textarea rows={3} maxLength={500} value={seo.description ?? ""} onChange={(e) => onChange({ ...seo, description: e.target.value || undefined })} />
      </Field>
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Keywords</p>
        <ChipsInput ariaLabel="SEO keywords" value={seo.keywords ?? []} onChange={(k) => onChange({ ...seo, keywords: k.length ? k : undefined })} />
      </div>
      <MediaUrlField kind="IMAGE" ownerType={ownerType} ownerId={ownerId} label="Social share image (OG)" value={seo.ogImage ?? null} onChange={(u) => onChange({ ...seo, ogImage: u ?? undefined })} />
    </div>
  );
}

