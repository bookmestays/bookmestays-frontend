"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/use-api";
import type { PartnerPropertyDetail } from "@/lib/types";
import { Button, useToast } from "@/components/ui";
import { SaveBar, Section } from "@/components/panel/page";
import { sameJson, useUnsavedChanges } from "@/components/panel/unsaved";
import { useSiteMeta } from "@/components/panel/util";
import {
  PropertyDetailsFields,
  PropertyLocationFields,
  PropertyPolicyFields,
  propertyFormFromDetail,
  propertyPayload,
  validatePropertyForm,
  type PropertyFormErrors,
  type PropertyFormState,
} from "@/components/panel/property-form";

export function ContentTab({ property, onUpdated }: { property: PartnerPropertyDetail; onUpdated: (p: PartnerPropertyDetail) => void }) {
  const toast = useToast();
  const meta = useSiteMeta();
  const [initial, setInitial] = useState(() => propertyFormFromDetail(property));
  const [s, setS] = useState<PropertyFormState>(initial);
  const [errors, setErrors] = useState<PropertyFormErrors>({});
  const [busy, setBusy] = useState(false);
  const dirty = !sameJson(s, initial);
  useUnsavedChanges(dirty);
  const set = (patch: Partial<PropertyFormState>) => setS((prev) => ({ ...prev, ...patch }));
  const props = { s, set, errors };

  const save = async () => {
    const errs = validatePropertyForm(s);
    setErrors(errs);
    if (Object.keys(errs).length) return toast.error("Please fix the highlighted fields.");
    setBusy(true);
    try {
      const next = await api<PartnerPropertyDetail>(`/admin/properties/${property.id}`, { method: "PATCH", body: propertyPayload(s) });
      const f = propertyFormFromDetail(next);
      setInitial(f);
      setS(f);
      onUpdated(next);
      toast.success("Property saved");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-4"
    >
      <Section title="Details">
        <PropertyDetailsFields {...props} />
      </Section>
      <Section title="Location">
        <PropertyLocationFields {...props} cities={meta.data?.cities ?? []} />
      </Section>
      <Section title="Policies">
        <PropertyPolicyFields {...props} />
      </Section>
      <SaveBar dirty={dirty}>
        <Button variant="outline" disabled={!dirty || busy} onClick={() => setS(initial)}>
          Discard
        </Button>
        <Button type="submit" loading={busy} disabled={!dirty}>
          Save changes
        </Button>
      </SaveBar>
    </form>
  );
}
