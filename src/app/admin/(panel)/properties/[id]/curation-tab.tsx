"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/use-api";
import type { PartnerPropertyDetail, Seo } from "@/lib/types";
import { Button, Field, Input, useToast } from "@/components/ui";
import { SaveBar, Section } from "@/components/panel/page";
import { NumberInput, Toggle } from "@/components/panel/inputs";
import { SeoFields } from "@/components/panel/seo-fields";
import { sameJson, useUnsavedChanges } from "@/components/panel/unsaved";
import { slugify } from "@/components/panel/util";

type State = { isFeatured: boolean; isRecommended: boolean; isComingSoon: boolean; curationRank: number | null; slug: string; seo: Seo };

export function CurationTab({ property, onUpdated }: { property: PartnerPropertyDetail; onUpdated: (p: PartnerPropertyDetail) => void }) {
  const toast = useToast();
  const from = (p: PartnerPropertyDetail): State => ({ isFeatured: p.isFeatured, isRecommended: p.isRecommended, isComingSoon: p.isComingSoon, curationRank: p.curationRank ?? 0, slug: p.slug, seo: p.seo ?? {} });
  const [initial, setInitial] = useState(() => from(property));
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = !sameJson(s, initial);
  useUnsavedChanges(dirty);
  const slugErr = slugify(s.slug) !== s.slug ? "Use lowercase letters, numbers and hyphens" : s.slug.length < 2 ? "Too short" : null;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (slugErr) return;
        setBusy(true);
        try {
          const next = await api<PartnerPropertyDetail>(`/admin/properties/${property.id}`, {
            method: "PATCH",
            body: { isFeatured: s.isFeatured, isRecommended: s.isRecommended, isComingSoon: s.isComingSoon, curationRank: s.curationRank ?? 0, ...(s.slug !== initial.slug ? { slug: s.slug } : {}), seo: Object.keys(s.seo).length ? s.seo : null },
          });
          const f = from(next);
          setInitial(f);
          setS(f);
          onUpdated(next);
          toast.success("Curation saved");
        } catch (err) {
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Section title="Availability" description="Coming-soon stays stay listed with full details, but guests can’t book them yet — the booking panel shows a “Coming soon” message instead. Turn this off when the property is ready to accept bookings.">
        <div className="max-w-lg space-y-4">
          <Toggle
            label="Coming soon"
            description="Listed on the site, but not yet open for bookings"
            checked={s.isComingSoon}
            onChange={(v) => setS({ ...s, isComingSoon: v })}
          />
          {s.isComingSoon && property.status !== "LIVE" && (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              This property isn’t live yet, so it won’t appear on the site until it’s approved and published. Once live, it will show as “Coming soon”.
            </p>
          )}
        </div>
      </Section>
      <Section title="Homepage curation" description="Featured and recommended stays appear in their homepage sections, ordered by rank (lower first).">
        <div className="max-w-lg space-y-4">
          <Toggle label="Featured stay" description="Shown in the “Featured” section" checked={s.isFeatured} onChange={(v) => setS({ ...s, isFeatured: v })} />
          <Toggle label="Recommended stay" description="Shown in “Recommended for you”" checked={s.isRecommended} onChange={(v) => setS({ ...s, isRecommended: v })} />
          <Field label="Curation rank" hint="Lower numbers appear first">
            <NumberInput value={s.curationRank} onChange={(v) => setS({ ...s, curationRank: v })} className="w-32" />
          </Field>
        </div>
      </Section>
      <Section title="URL & SEO">
        <div className="space-y-4">
          <Field label="URL slug" error={slugErr} hint={`bookmestays.in/stays/${s.slug || "…"} — changing it breaks old links`}>
            <Input value={s.slug} onChange={(e) => setS({ ...s, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} aria-invalid={!!slugErr} className="font-mono" />
          </Field>
          <SeoFields seo={s.seo} onChange={(seo) => setS({ ...s, seo })} ownerType="PROPERTY" ownerId={property.id} />
        </div>
      </Section>
      <SaveBar dirty={dirty}>
        <Button variant="outline" disabled={!dirty} onClick={() => setS(initial)}>
          Discard
        </Button>
        <Button type="submit" loading={busy} disabled={!dirty || !!slugErr}>
          Save
        </Button>
      </SaveBar>
    </form>
  );
}
