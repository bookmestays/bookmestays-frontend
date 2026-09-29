"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Ban, CheckCircle2, ExternalLink, RotateCcw, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { PROPERTY_TYPE_LABELS, type PartnerPropertyDetail } from "@/lib/types";
import { Badge, Button, buttonClass, useToast } from "@/components/ui";
import { Alert, LoadState, PageHeader, Tabs } from "@/components/panel/page";
import { StatusBadge } from "@/components/panel/status-badge";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { MediaManager } from "@/components/panel/media-manager";
import { useUrlParams } from "@/components/panel/url-state";
import { ContentTab } from "./content-tab";
import { RoomsTab } from "./rooms-tab";
import { AmenitiesTab } from "./amenities-tab";
import { CurationTab } from "./curation-tab";
import { NearbyList } from "./nearby-list";

type TabKey = "content" | "media" | "rooms" | "amenities" | "nearby" | "curation";
type ReviewAction = "APPROVE" | "REJECT" | "SUSPEND" | "UNSUSPEND";

const ACTION_COPY: Record<ReviewAction, { title: string; label: string; tone: "primary" | "danger"; notesRequired: boolean; description: string }> = {
  APPROVE: { title: "Approve & publish?", label: "Approve", tone: "primary", notesRequired: false, description: "The property goes LIVE and pending room types are approved with it. The partner is notified." },
  REJECT: { title: "Reject submission?", label: "Reject", tone: "danger", notesRequired: true, description: "The partner sees your notes and can resubmit." },
  SUSPEND: { title: "Suspend property?", label: "Suspend", tone: "danger", notesRequired: false, description: "The property is hidden from guests immediately. Existing bookings are unaffected." },
  UNSUSPEND: { title: "Restore property?", label: "Restore", tone: "primary", notesRequired: false, description: "The property becomes visible to guests again." },
};

export default function AdminPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { get, set } = useUrlParams();
  const tab = (get("tab") || "content") as TabKey;
  const { data, error, loading, refetch, mutate } = useApi<PartnerPropertyDetail>(`/admin/properties/${id}`);
  const [action, setAction] = useState<ReviewAction | null>(null);
  const p = data?.id === id ? data : undefined;
  const onUpdated = (next: PartnerPropertyDetail) => mutate(() => next);
  const pending = p?.roomTypes.filter((r) => r.status === "PENDING_APPROVAL").length ?? 0;

  return (
    <LoadState loading={loading && !p} error={p ? null : error} onRetry={refetch}>
      {p && (
        <>
          <PageHeader
            title={p.name}
            breadcrumbs={[{ label: "Properties", href: "/admin/properties" }, { label: p.name }]}
            description={
              <>
                {PROPERTY_TYPE_LABELS[p.type]} · {p.city?.name ?? "No city"} · <a href={`/admin/partners/${p.partnerId}`} className="text-brand hover:underline">View partner</a>
              </>
            }
            meta={
              <>
                <StatusBadge kind="property" status={p.status} />
                {p.channelManaged && <Badge tone="info">Channel managed</Badge>}
              </>
            }
            actions={
              <>
                <a href={`/stays/${p.slug}?preview=1`} target="_blank" rel="noreferrer" className={buttonClass("outline", "sm")}>
                  <ExternalLink className="size-4" /> View on site
                </a>
                {(p.status === "PENDING_REVIEW" || p.status === "DRAFT" || p.status === "REJECTED") && (
                  <Button size="sm" onClick={() => setAction("APPROVE")}>
                    <CheckCircle2 className="size-4" /> Approve
                  </Button>
                )}
                {(p.status === "PENDING_REVIEW" || p.status === "DRAFT") && (
                  <Button size="sm" variant="outline" onClick={() => setAction("REJECT")}>
                    <XCircle className="size-4" /> Reject
                  </Button>
                )}
                {p.status === "LIVE" && (
                  <Button size="sm" variant="danger" onClick={() => setAction("SUSPEND")}>
                    <Ban className="size-4" /> Suspend
                  </Button>
                )}
                {p.status === "SUSPENDED" && (
                  <Button size="sm" onClick={() => setAction("UNSUSPEND")}>
                    <RotateCcw className="size-4" /> Restore
                  </Button>
                )}
              </>
            }
          />
          {p.reviewNotes && (
            <Alert tone={p.status === "REJECTED" || p.status === "SUSPENDED" ? "danger" : "info"} title="Review notes" className="mb-4">
              {p.reviewNotes}
            </Alert>
          )}
          <Tabs<TabKey>
            className="mb-5"
            value={tab}
            onChange={(k) => set({ tab: k === "content" ? null : k })}
            tabs={[
              { key: "content", label: "Content" },
              { key: "media", label: "Photos & videos", badge: <Badge>{p.media.length}</Badge> },
              { key: "rooms", label: "Rooms & rates", badge: pending ? <Badge tone="warning">{pending} pending</Badge> : <Badge>{p.roomTypes.length}</Badge> },
              { key: "amenities", label: "Amenities" },
              { key: "nearby", label: "Nearby" },
              { key: "curation", label: "Curation & SEO" },
            ]}
          />
          <div role="tabpanel">
            {tab === "content" && <ContentTab property={p} onUpdated={onUpdated} />}
            {tab === "media" && <MediaManager ownerType="PROPERTY" ownerId={p.id} minImages={3} />}
            {tab === "rooms" && <RoomsTab property={p} onChanged={refetch} />}
            {tab === "amenities" && <AmenitiesTab property={p} onUpdated={onUpdated} />}
            {tab === "nearby" && <NearbyList property={p} />}
            {tab === "curation" && <CurationTab property={p} onUpdated={onUpdated} />}
          </div>
          <ConfirmDialog
            open={!!action}
            onClose={() => setAction(null)}
            title={action ? ACTION_COPY[action].title : ""}
            description={action ? ACTION_COPY[action].description : undefined}
            confirmLabel={action ? ACTION_COPY[action].label : "Confirm"}
            tone={action ? ACTION_COPY[action].tone : "primary"}
            notes={{ label: "Notes for the partner", required: action ? ACTION_COPY[action].notesRequired : false, placeholder: action === "REJECT" ? "What needs to change before approval?" : "Optional" }}
            onConfirm={async (notes) => {
              const next = await api<PartnerPropertyDetail>(`/admin/properties/${p.id}/review`, { method: "POST", body: { action, notes: notes || undefined } });
              onUpdated(next);
              toast.success("Property status updated");
            }}
          />
        </>
      )}
    </LoadState>
  );
}
