"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import type { NearbyPlace, PartnerPropertyDetail } from "@/lib/types";
import { Button, Card, EmptyState, ErrorState, Field, Input, Modal, Select, Skeleton, Textarea, useToast } from "@/components/ui";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { MediaManager } from "@/components/panel/media-manager";
import { Tabs } from "@/components/panel/page";
import { asList, nullIfEmpty } from "@/components/panel/util";

const CATEGORIES = ["Beach", "Temple", "Fort / heritage", "Market", "Restaurant", "Cafe", "Nature", "Waterfall", "Viewpoint", "Museum", "Airport", "Railway station", "Hospital", "Other"];

export function NearbyTab({ property }: { property: PartnerPropertyDetail }) {
  const toast = useToast();
  const path = `/partner/properties/${property.id}/nearby`;
  const { data, error, loading, refetch } = useApi<NearbyPlace[] | { items: NearbyPlace[] }>(path);
  const items = data ? asList(data) : property.nearby;
  const [editing, setEditing] = useState<NearbyPlace | "new" | null>(null);
  const [deleting, setDeleting] = useState<NearbyPlace | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">Attractions, beaches, restaurants and transport hubs guests care about.</p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Add place
        </Button>
      </div>
      {error && !data ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : loading && !data && !items.length ? (
        <Skeleton className="h-32" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={<MapPin />} title="No nearby places yet" />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => (
            <Card key={n.id} className="flex flex-col p-4">
              <p className="font-medium text-ink">{n.name}</p>
              <p className="text-xs text-muted">
                {n.category}
                {n.distanceKm != null && ` · ${n.distanceKm} km`} · {n.media.length} media
              </p>
              {n.description && <p className="mt-2 line-clamp-3 text-sm text-ink-2">{n.description}</p>}
              <div className="mt-auto flex justify-end gap-1 pt-3">
                <Button size="sm" variant="ghost" onClick={() => setEditing(n)}>
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${n.name}`} className="hover:text-danger" onClick={() => setDeleting(n)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add nearby place" : "Edit nearby place"} size="lg">
        {editing && <NearbyForm propertyId={property.id} place={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={refetch} />}
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Remove ${deleting?.name}?`}
        tone="danger"
        confirmLabel="Remove"
        onConfirm={async () => {
          await api(`/partner/nearby/${deleting?.id}`, { method: "DELETE" });
          toast.success("Removed");
          refetch();
        }}
      />
    </div>
  );
}

function NearbyForm({ propertyId, place, onClose, onSaved }: { propertyId: string; place: NearbyPlace | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<"details" | "media">("details");
  const [saved, setSaved] = useState<NearbyPlace | null>(place);
  const [f, setF] = useState({
    name: place?.name ?? "",
    category: place?.category ?? "",
    description: place?.description ?? "",
    distanceKm: place?.distanceKm != null ? String(place.distanceKm) : "",
    lat: place?.lat != null ? String(place.lat) : "",
    lng: place?.lng != null ? String(place.lng) : "",
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const errs = { name: !f.name.trim() ? "Name is required" : null, distanceKm: f.distanceKm && (isNaN(Number(f.distanceKm)) || Number(f.distanceKm) < 0) ? "Enter a distance in km" : null };
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (errs.name || errs.distanceKm) return;
        setBusy(true);
        try {
          const body = {
            name: f.name.trim(),
            category: f.category || "Other",
            description: nullIfEmpty(f.description),
            distanceKm: f.distanceKm ? Number(f.distanceKm) : null,
            lat: f.lat ? Number(f.lat) : null,
            lng: f.lng ? Number(f.lng) : null,
          };
          const res = await api<NearbyPlace>(saved ? `/partner/nearby/${saved.id}` : `/partner/properties/${propertyId}/nearby`, { method: saved ? "PATCH" : "POST", body });
          toast.success("Saved");
          onSaved();
          if (!saved) {
            setSaved(res);
            setTab("media");
          } else onClose();
        } catch (err) {
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "details", label: "Details" },
          { key: "media", label: "Photos & videos" },
        ]}
      />
      {tab === "details" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required error={touched ? errs.name : null}>
            <Input value={f.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Category">
            <Select value={f.category} onChange={(e) => set({ category: e.target.value })}>
              <option value="">Select</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Distance (km)" error={touched ? errs.distanceKm : null}>
            <Input inputMode="decimal" value={f.distanceKm} onChange={(e) => set({ distanceKm: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Latitude">
              <Input inputMode="decimal" value={f.lat} onChange={(e) => set({ lat: e.target.value })} />
            </Field>
            <Field label="Longitude">
              <Input inputMode="decimal" value={f.lng} onChange={(e) => set({ lng: e.target.value })} />
            </Field>
          </div>
          <Field label="Description" className="sm:col-span-2">
            <Textarea rows={3} value={f.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
        </div>
      ) : (
        <MediaManager ownerType="NEARBY_PLACE" ownerId={saved?.id ?? null} tags={["SURROUNDINGS", "VIEW", "EXPERIENCE", "OTHER"]} defaultTag="SURROUNDINGS" />
      )}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onClose}>
          {saved && !place ? "Done" : "Cancel"}
        </Button>
        {tab === "details" && (
          <Button type="submit" loading={busy}>
            Save
          </Button>
        )}
      </div>
    </form>
  );
}
