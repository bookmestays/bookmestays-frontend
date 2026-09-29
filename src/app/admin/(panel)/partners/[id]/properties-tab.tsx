"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import type { AdminPropertyRow, PartnerDetail } from "@/lib/types";
import { Button } from "@/components/ui";
import { DataTable } from "@/components/panel/data-table";
import { propertyColumns } from "../../../_components/property-columns";
import { NewPropertyDialog } from "../../../_components/new-property-dialog";

export function PropertiesTab({ partner }: { partner: PartnerDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Add property for partner
        </Button>
      </div>
      <DataTable<AdminPropertyRow>
        columns={propertyColumns({ showPartner: false })}
        rows={partner.properties}
        rowKey={(r) => r.id}
        rowHref={(r) => `/admin/properties/${r.id}`}
        empty={{ title: "No properties yet", description: "The partner can add properties from their panel, or you can create one on their behalf." }}
      />
      <NewPropertyDialog open={open} onClose={() => setOpen(false)} partnerId={partner.id} />
    </div>
  );
}
