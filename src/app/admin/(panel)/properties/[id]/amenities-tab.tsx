"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/use-api";
import type { PartnerPropertyDetail } from "@/lib/types";
import { Button, Skeleton, useToast } from "@/components/ui";
import { SaveBar, Section } from "@/components/panel/page";
import { AmenitiesPicker } from "@/components/panel/property-form";
import { sameJson } from "@/components/panel/unsaved";
import { useSiteMeta } from "@/components/panel/util";

export function AmenitiesTab({ property, onUpdated }: { property: PartnerPropertyDetail; onUpdated: (p: PartnerPropertyDetail) => void }) {
  const toast = useToast();
  const meta = useSiteMeta();
  const [initial, setInitial] = useState(() => property.amenities.map((a) => a.id).sort());
  const [ids, setIds] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = !sameJson([...ids].sort(), initial);
  return (
    <>
      <Section title="Property amenities">
        {meta.data ? <AmenitiesPicker amenities={meta.data.amenities} value={ids} onChange={setIds} scope="PROPERTY" /> : <Skeleton className="h-48" />}
      </Section>
      <SaveBar dirty={dirty}>
        <Button
          loading={busy}
          disabled={!dirty}
          onClick={async () => {
            setBusy(true);
            try {
              const next = await api<PartnerPropertyDetail>(`/admin/properties/${property.id}`, { method: "PATCH", body: { amenityIds: ids } });
              setInitial([...ids].sort());
              onUpdated(next);
              toast.success("Amenities saved");
            } catch (e) {
              toast.error(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Save amenities
        </Button>
      </SaveBar>
    </>
  );
}
