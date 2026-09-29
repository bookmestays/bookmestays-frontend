"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import { PROPERTY_TYPE_LABELS, type Paginated, type PartnerSummary, type PropertyDetail, type PropertyType } from "@/lib/types";
import { Button, Field, Input, Modal, Select, useToast } from "@/components/ui";
import { useSiteMeta } from "@/components/panel/util";

/** Admin creates a DRAFT property on a partner's behalf. */
export function NewPropertyDialog({ open, onClose, partnerId }: { open: boolean; onClose: () => void; partnerId?: string }) {
  return (
    <Modal open={open} onClose={onClose} title="New property">
      {open && <Body onClose={onClose} fixedPartnerId={partnerId} />}
    </Modal>
  );
}

function Body({ onClose, fixedPartnerId }: { onClose: () => void; fixedPartnerId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const meta = useSiteMeta();
  const partners = useApi<Paginated<PartnerSummary>>(fixedPartnerId ? null : "/admin/partners", { limit: 100 });
  const [partnerId, setPartnerId] = useState(fixedPartnerId ?? "");
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("HOTEL");
  const [cityId, setCityId] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const errs = {
    partnerId: !partnerId ? "Choose a partner" : null,
    name: name.trim().length < 2 ? "Enter a name" : null,
    cityId: !cityId ? "Choose a city" : null,
  };
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (errs.partnerId || errs.name || errs.cityId) return;
        setBusy(true);
        try {
          const p = await api<PropertyDetail>("/admin/properties", { method: "POST", body: { partnerId, name: name.trim(), type, cityId } });
          toast.success("Property created as draft");
          onClose();
          router.push(`/admin/properties/${p.id}`);
        } catch (err) {
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      {!fixedPartnerId && (
        <Field label="Partner" required error={touched ? errs.partnerId : null}>
          <Select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
            <option value="">{partners.loading ? "Loading…" : "Select partner"}</option>
            {partners.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Property name" required error={touched ? errs.name : null}>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" required>
          <Select value={type} onChange={(e) => setType(e.target.value as PropertyType)}>
            {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
              <option key={t} value={t}>
                {PROPERTY_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="City" required error={touched ? errs.cityId : null}>
          <Select value={cityId} onChange={(e) => setCityId(e.target.value)}>
            <option value="">Select city</option>
            {meta.data?.cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          Create draft
        </Button>
      </div>
    </form>
  );
}
