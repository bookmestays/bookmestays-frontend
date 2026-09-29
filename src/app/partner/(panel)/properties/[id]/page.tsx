"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Circle, ExternalLink, Send, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import type { PartnerPropertyDetail } from "@/lib/types";
import { Badge, Button, Modal, buttonClass, useToast } from "@/components/ui";
import { Alert, LoadState, PageHeader, SaveBar, Section, Tabs, type TabDef } from "@/components/panel/page";
import { StatusBadge } from "@/components/panel/status-badge";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { MediaManager } from "@/components/panel/media-manager";
import { sameJson, useUnsavedChanges } from "@/components/panel/unsaved";
import { useUrlParams } from "@/components/panel/url-state";
import { useSiteMeta } from "@/components/panel/util";
import {
  DETAIL_FIELDS,
  LOCATION_FIELDS,
  POLICY_FIELDS,
  PropertyDetailsFields,
  PropertyLocationFields,
  PropertyPolicyFields,
  propertyFormFromDetail,
  propertyPayload,
  validatePropertyForm,
  type PropertyFormErrors,
  type PropertyFormState,
} from "@/components/panel/property-form";
import { RequirePermission } from "../../../_components/require";
import { RoomsTab } from "./rooms-tab";
import { AmenitiesTab } from "./amenities-tab";
import { NearbyTab } from "./nearby-tab";
import { ChannelTab } from "./channel-tab";

type TabKey = "details" | "location" | "media" | "rooms" | "amenities" | "nearby" | "policies" | "channel";
const CONTENT_TABS: Partial<Record<TabKey, (keyof PropertyFormState)[]>> = { details: DETAIL_FIELDS, location: LOCATION_FIELDS, policies: POLICY_FIELDS };

function checklist(p: PartnerPropertyDetail) {
  const images = p.media.filter((m) => m.kind === "IMAGE").length;
  return [
    { ok: !!p.shortDescription && !!p.description, label: "Short and full description", tab: "details" as TabKey },
    { ok: !!(p.cityId ?? p.city) && !!p.address, label: "City and street address", tab: "location" as TabKey },
    { ok: images >= 3, label: `At least 3 photos (${images} uploaded)`, tab: "media" as TabKey },
    { ok: p.roomTypes.some((r) => r.status !== "INACTIVE" && r.ratePlans.length > 0), label: "At least one room type with a rate plan", tab: "rooms" as TabKey },
    { ok: !!p.cancellationPolicy, label: "Cancellation policy", tab: "policies" as TabKey },
  ];
}

export default function PartnerPropertyEditorPage() {
  return (
    <RequirePermission perm="content">
      <Editor />
    </RequirePermission>
  );
}

function Editor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const meta = useSiteMeta();
  const { get, set: setParam } = useUrlParams();
  const tab = (get("tab") || "details") as TabKey;
  const { data, error, loading, refetch, mutate } = useApi<PartnerPropertyDetail>(`/partner/properties/${id}`);
  const p = data?.id === id ? data : undefined;

  const [synced, setSynced] = useState<PartnerPropertyDetail | null>(null);
  const [initial, setInitial] = useState<PropertyFormState | null>(null);
  const [s, setS] = useState<PropertyFormState | null>(null);
  if (p && p !== synced) {
    // first load, or a fresh server copy after save/refetch → reset the form baseline (keeps local edits when unchanged)
    const f = propertyFormFromDetail(p);
    setSynced(p);
    if (!initial || !s || sameJson(s, initial)) setS(f);
    setInitial(f);
  }
  const [errors, setErrors] = useState<PropertyFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dirty = !!s && !!initial && !sameJson(s, initial);
  useUnsavedChanges(dirty);

  const set = (patch: Partial<PropertyFormState>) => {
    setS((prev) => (prev ? { ...prev, ...patch } : prev));
    setErrors((e) => {
      const n = { ...e };
      for (const k of Object.keys(patch)) delete n[k as keyof PropertyFormState];
      return n;
    });
  };

  const save = async () => {
    if (!s || !p) return false;
    const errs = validatePropertyForm(s);
    setErrors(errs);
    const bad = Object.keys(errs) as (keyof PropertyFormState)[];
    if (bad.length) {
      const t = (Object.keys(CONTENT_TABS) as TabKey[]).find((k) => CONTENT_TABS[k]?.some((f) => bad.includes(f)));
      if (t && t !== tab) setParam({ tab: t === "details" ? null : t });
      toast.error("Please fix the highlighted fields.");
      return false;
    }
    setSaving(true);
    try {
      const next = await api<PartnerPropertyDetail>(`/partner/properties/${p.id}`, { method: "PATCH", body: propertyPayload(s) });
      const f = propertyFormFromDetail(next);
      setInitial(f);
      setS(f);
      setSynced(next);
      mutate(() => next);
      toast.success(p.status === "LIVE" ? "Saved — changes are live" : "Saved");
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const tabs: TabDef<TabKey>[] = [
    { key: "details", label: "Details" },
    { key: "location", label: "Location" },
    { key: "media", label: "Photos & videos", badge: p ? <Badge>{p.media.length}</Badge> : undefined },
    { key: "rooms", label: "Rooms & rates", badge: p ? <Badge>{p.roomTypes.length}</Badge> : undefined },
    { key: "amenities", label: "Amenities" },
    { key: "nearby", label: "Nearby places" },
    { key: "policies", label: "Policies" },
    { key: "channel", label: "Channel manager", badge: p?.channelManaged ? <Badge tone="info">On</Badge> : undefined },
  ];
  const isContentTab = tab in CONTENT_TABS;
  const canSubmit = p && (p.status === "DRAFT" || p.status === "REJECTED");

  return (
    <LoadState loading={loading && !p} error={p ? null : error} onRetry={refetch}>
      {p && s && (
        <>
          <PageHeader
            title={p.name}
            breadcrumbs={[{ label: "Properties", href: "/partner/properties" }, { label: p.name }]}
            meta={<StatusBadge kind="property" status={p.status} />}
            actions={
              <>
                <a href={`/stays/${p.slug}?preview=1`} target="_blank" rel="noreferrer" className={buttonClass("outline", "sm")}>
                  <ExternalLink className="size-4" /> Preview
                </a>
                {(p.status === "DRAFT" || p.status === "REJECTED") && (
                  <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setDeleting(true)} aria-label="Delete draft">
                    <Trash2 className="size-4" />
                  </Button>
                )}
                {canSubmit && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (dirty && !(await save())) return;
                      refetch();
                      setSubmitOpen(true);
                    }}
                  >
                    <Send className="size-4" /> Submit for review
                  </Button>
                )}
              </>
            }
          />
          {p.status === "REJECTED" && p.reviewNotes && (
            <Alert tone="danger" title="Changes requested by BookMeStays" className="mb-4">
              {p.reviewNotes}
            </Alert>
          )}
          {p.status === "PENDING_REVIEW" && (
            <Alert tone="info" title="Under review" className="mb-4">
              Our team is reviewing this property. You can keep editing; we&apos;ll email you when it&apos;s live.
            </Alert>
          )}
          {p.status === "SUSPENDED" && (
            <Alert tone="danger" title="Suspended" className="mb-4">
              {p.reviewNotes ?? "This property is hidden from guests. Contact BookMeStays support."}
            </Alert>
          )}
          <Tabs<TabKey> className="mb-5" tabs={tabs} value={tab} onChange={(k) => setParam({ tab: k === "details" ? null : k })} />
          <div role="tabpanel">
            {tab === "details" && (
              <Section>
                <PropertyDetailsFields s={s} set={set} errors={errors} />
              </Section>
            )}
            {tab === "location" && (
              <Section>
                <PropertyLocationFields s={s} set={set} errors={errors} cities={meta.data?.cities ?? []} />
              </Section>
            )}
            {tab === "policies" && (
              <Section>
                <PropertyPolicyFields s={s} set={set} errors={errors} />
              </Section>
            )}
            {tab === "media" && (
              <Section title="Photos & videos" description="Upload at least 3 photos. Star a photo to make it the cover, and star a video to use it as the preview on listing cards. Room photos go under Rooms & rates.">
                <MediaManager ownerType="PROPERTY" ownerId={p.id} minImages={3} tags={["EXTERIOR", "COMMON_AREA", "POOL", "DINING", "VIEW", "SURROUNDINGS", "AMENITY", "ROOM_WALKTHROUGH", "OTHER"]} />
              </Section>
            )}
            {tab === "rooms" && <RoomsTab property={p} onChanged={refetch} />}
            {tab === "amenities" && <AmenitiesTab property={p} onUpdated={(next) => mutate(() => next)} />}
            {tab === "nearby" && <NearbyTab property={p} />}
            {tab === "channel" && <ChannelTab property={p} onChanged={refetch} />}
          </div>
          {isContentTab && (
            <SaveBar dirty={dirty} message={dirty ? "Unsaved changes (Details, Location & Policies are saved together)" : undefined}>
              <Button variant="outline" disabled={!dirty || saving} onClick={() => initial && setS(initial)}>
                Discard
              </Button>
              <Button loading={saving} disabled={!dirty} onClick={save}>
                Save changes
              </Button>
            </SaveBar>
          )}
          <Modal open={submitOpen} onClose={() => setSubmitOpen(false)} title="Submit for review">
            {submitOpen && (
              <SubmitDialog
                property={p}
                onGo={(t) => {
                  setSubmitOpen(false);
                  setParam({ tab: t === "details" ? null : t });
                }}
                onDone={(next) => {
                  mutate(() => next);
                  setSubmitOpen(false);
                }}
              />
            )}
          </Modal>
          <ConfirmDialog
            open={deleting}
            onClose={() => setDeleting(false)}
            title="Delete this draft?"
            description="The property, its rooms and media will be removed permanently."
            confirmLabel="Delete"
            tone="danger"
            onConfirm={async () => {
              await api(`/partner/properties/${p.id}`, { method: "DELETE" });
              toast.success("Property deleted");
              router.push("/partner/properties");
            }}
          />
        </>
      )}
    </LoadState>
  );
}

function SubmitDialog({ property, onGo, onDone }: { property: PartnerPropertyDetail; onGo: (t: TabKey) => void; onDone: (p: PartnerPropertyDetail) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const items = checklist(property);
  const ready = items.every((i) => i.ok);
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-2">Before we can review {property.name}, please make sure it has:</p>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2 text-sm">
            {i.ok ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted" />}
            <span className={i.ok ? "text-ink" : "text-ink-2"}>{i.label}</span>
            {!i.ok && (
              <button type="button" className="ml-auto text-xs font-medium text-brand hover:underline" onClick={() => onGo(i.tab)}>
                Fix
              </button>
            )}
          </li>
        ))}
      </ul>
      {serverError && (
        <p role="alert" className="rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">
          {serverError}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button
          loading={busy}
          disabled={!ready}
          onClick={async () => {
            setBusy(true);
            setServerError(null);
            try {
              const next = await api<PartnerPropertyDetail>(`/partner/properties/${property.id}/submit`, { method: "POST" });
              toast.success("Submitted! We'll review it shortly.");
              onDone(next && typeof next === "object" && "id" in next ? next : { ...property, status: "PENDING_REVIEW" });
            } catch (e) {
              setServerError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Send className="size-4" /> Submit for review
        </Button>
      </div>
    </div>
  );
}
