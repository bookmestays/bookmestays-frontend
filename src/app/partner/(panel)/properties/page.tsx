"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import { formatDate, formatINR } from "@/lib/format";
import { PROPERTY_TYPE_LABELS, type PartnerPropertyDetail, type PartnerPropertyRow, type PropertyType } from "@/lib/types";
import { Badge, Button, Field, Input, Modal, Select, useToast } from "@/components/ui";
import { PageHeader } from "@/components/panel/page";
import { DataTable } from "@/components/panel/data-table";
import { StatusBadge } from "@/components/panel/status-badge";
import { useSiteMeta } from "@/components/panel/util";
import { PropertyThumb } from "@/components/panel/property-thumb";
import { RequirePermission } from "../../_components/require";

export default function PartnerPropertiesPage() {
  const { data, error, loading, refetch } = useApi<PartnerPropertyRow[]>("/partner/properties");
  const [adding, setAdding] = useState(false);
  return (
    <RequirePermission perm="content">
      <PageHeader
        title="Properties"
        description="Your listings on BookMeStays. New properties go live after a quick review by our team."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add property
          </Button>
        }
      />
      <DataTable<PartnerPropertyRow>
        rows={data}
        rowKey={(p) => p.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        rowHref={(p) => `/partner/properties/${p.id}`}
        columns={[
          {
            key: "name",
            header: "Property",
            cell: (p) => (
              <div className="flex min-w-0 items-center gap-3">
                <PropertyThumb url={p.coverImageUrl} name={p.name} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{p.name}</p>
                  <p className="text-xs text-muted">
                    {PROPERTY_TYPE_LABELS[p.type]} · {p.cityName ?? "No city"}
                  </p>
                </div>
              </div>
            ),
            sortValue: (p) => p.name,
          },
          {
            key: "rooms",
            header: "Room types",
            cell: (p) => (
              <span>
                {p.roomTypeCount}
                {p.pendingRoomTypes > 0 && <Badge tone="warning" className="ml-1.5">{p.pendingRoomTypes} pending</Badge>}
              </span>
            ),
            hideBelow: "sm",
          },
          { key: "price", header: "From", cell: (p) => formatINR(p.startingPrice), align: "right", hideBelow: "md" },
          { key: "cm", header: "Channel manager", cell: (p) => (p.channelManaged ? <Badge tone="info">Connected</Badge> : <span className="text-muted">—</span>), hideBelow: "lg" },
          {
            key: "status",
            header: "Status",
            cell: (p) => (
              <div>
                <StatusBadge kind="property" status={p.status} />
                {p.status === "REJECTED" && p.reviewNotes && <p className="mt-0.5 line-clamp-1 max-w-48 text-xs text-danger">{p.reviewNotes}</p>}
              </div>
            ),
          },
          { key: "updated", header: "Updated", cell: (p) => formatDate(p.updatedAt), hideBelow: "md" },
        ]}
        empty={{
          title: "Add your first property",
          description: "Tell guests about your place — photos, rooms and rates. We'll review and publish it.",
          action: (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" /> Add property
            </Button>
          ),
        }}
      />
      <Modal open={adding} onClose={() => setAdding(false)} title="Add property">
        {adding && <AddPropertyForm onClose={() => setAdding(false)} />}
      </Modal>
    </RequirePermission>
  );
}

function AddPropertyForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const meta = useSiteMeta();
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("HOTEL");
  const [cityId, setCityId] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const errs = { name: name.trim().length < 2 ? "Enter the property name" : null, cityId: !cityId ? "Choose a city" : null };
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (errs.name || errs.cityId) return;
        setBusy(true);
        try {
          const p = await api<PartnerPropertyDetail>("/partner/properties", { method: "POST", body: { name: name.trim(), type, cityId } });
          toast.success("Draft created — let's add the details");
          onClose();
          router.push(`/partner/properties/${p.id}`);
        } catch (err) {
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
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
      <p className="text-xs text-muted">Your default cancellation policy and terms are copied to the new property; you can change them in the editor.</p>
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
