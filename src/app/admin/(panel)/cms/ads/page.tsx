"use client";
/* eslint-disable @next/next/no-img-element -- arbitrary storage hosts */

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, ImageIcon, Megaphone, Pencil, Plus, Smartphone, Monitor, Trash2, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import { HOME_AD_SPECS, homeAdSizeError } from "@/lib/home-ads";
import type { AdminHomeAd } from "@/lib/panel-types";
import type { HomeSectionType } from "@/lib/types";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, Select, Skeleton, useToast } from "@/components/ui";
import { PageHeader } from "@/components/panel/page";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { Toggle } from "@/components/panel/inputs";
import { probeImage, uploadFile, validateFile } from "@/components/panel/media-upload";
import { asList, fromLocalInput, nullIfEmpty, toLocalInput } from "@/components/panel/util";
import { formatDateTime } from "@/components/panel/labels";

const SLOTS: { value: HomeSectionType; label: string }[] = [
  { value: "RECOMMENDED", label: "Recommended stays" },
  { value: "PROPERTY_TYPES", label: "Explore by property type" },
  { value: "FEATURED", label: "Featured & popular stays" },
  { value: "VIDEO_DISCOVERY", label: "Video discovery" },
  { value: "EXPERIENCES", label: "Experiences" },
  { value: "CITIES", label: "Explore by city" },
  { value: "COLLECTIONS", label: "Curated collections" },
  { value: "CITY_SPOTLIGHT", label: "City spotlight" },
  { value: "WHY_BOOKMESTAYS", label: "Why BookMeStays" },
];

export default function HomeAdsPage() {
  const toast = useToast();
  const { data, error, loading, refetch, mutate } = useApi<AdminHomeAd[]>("/admin/home-ads");
  const ads = asList(data);
  const [editing, setEditing] = useState<AdminHomeAd | { afterSection: HomeSectionType } | null>(null);
  const [deleting, setDeleting] = useState<AdminHomeAd | null>(null);

  const patch = async (a: AdminHomeAd, body: Partial<AdminHomeAd>) => {
    mutate((prev) => asList(prev).map((x) => (x.id === a.id ? { ...x, ...body } : x)));
    try {
      await api(`/admin/home-ads/${a.id}`, { method: "PATCH", body });
    } catch (e) {
      toast.error(errorMessage(e));
      refetch();
    }
  };

  const move = async (slot: AdminHomeAd[], i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slot.length) return;
    const order = [...slot];
    [order[i], order[j]] = [order[j], order[i]];
    mutate((prev) => asList(prev).map((x) => {
      const k = order.findIndex((o) => o.id === x.id);
      return k >= 0 ? { ...x, sort: k } : x;
    }));
    try {
      await Promise.all(order.map((a, k) => (a.sort !== k ? api(`/admin/home-ads/${a.id}`, { method: "PATCH", body: { sort: k } }) : null)));
    } catch (e) {
      toast.error(errorMessage(e));
      refetch();
    }
  };

  return (
    <>
      <PageHeader
        title="Ad posters"
        description="Promotional poster strips shown on the homepage after a section. Several active posters in the same slot rotate automatically."
        breadcrumbs={[{ label: "CMS" }, { label: "Ad posters" }]}
        actions={
          <Button onClick={() => setEditing({ afterSection: "RECOMMENDED" })}>
            <Plus className="size-4" /> New poster
          </Button>
        }
      />

      <SpecCard />

      {error && !data ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : loading && !data ? (
        <Skeleton className="h-48" />
      ) : ads.length === 0 ? (
        <Card>
          <EmptyState icon={<Megaphone />} title="No posters yet" description="Add a poster to show it after a homepage section." />
        </Card>
      ) : (
        <div className="space-y-6">
          {SLOTS.map((slot) => {
            const items = ads.filter((a) => a.afterSection === slot.value).sort((a, b) => a.sort - b.sort);
            if (!items.length) return null;
            return (
              <section key={slot.value}>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-ink">After “{slot.label}”</h2>
                  <Button size="sm" variant="ghost" onClick={() => setEditing({ afterSection: slot.value })}>
                    <Plus className="size-4" /> Add here
                  </Button>
                </div>
                <ul className="space-y-3">
                  {items.map((a, i) => (
                    <li key={a.id}>
                      <Card className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
                        <div className="aspect-[8/1] w-full shrink-0 overflow-hidden rounded-lg bg-surface-2 lg:w-96">
                          <img src={a.imageUrl} alt="" className="size-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-ink">{a.title}</p>
                            {a.mobileImageUrl ? <Badge tone="success">Mobile art</Badge> : <Badge tone="neutral">Desktop only</Badge>}
                          </div>
                          <p className="truncate text-xs text-muted">
                            {a.linkUrl ? `→ ${a.linkUrl}` : "No link"}
                            {(a.startsAt || a.endsAt) && ` · ${a.startsAt ? formatDateTime(a.startsAt) : "now"} → ${a.endsAt ? formatDateTime(a.endsAt) : "no end"}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="mr-2 w-24">
                            <Toggle label="Active" checked={a.isActive} onChange={(v) => patch(a, { isActive: v })} />
                          </div>
                          <Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(items, i, -1)}>
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button size="sm" variant="ghost" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(items, i, 1)}>
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setEditing(a)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="sm" variant="ghost" aria-label="Delete" className="hover:text-danger" onClick={() => setDeleting(a)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing && "id" in editing ? "Edit poster" : "New poster"} size="lg">
        {editing && (
          <AdForm
            ad={"id" in editing ? editing : null}
            defaultSlot={editing.afterSection}
            nextSort={ads.filter((a) => a.afterSection === editing.afterSection).length}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              refetch();
            }}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete poster?"
        tone="danger"
        confirmLabel="Delete"
        onConfirm={async () => {
          await api(`/admin/home-ads/${deleting?.id}`, { method: "DELETE" });
          toast.success("Poster deleted");
          refetch();
        }}
      />
    </>
  );
}

function SpecCard() {
  return (
    <Card className="mb-6 grid gap-4 p-4 text-sm sm:grid-cols-2">
      {(["desktop", "mobile"] as const).map((k) => {
        const s = HOME_AD_SPECS[k];
        const Icon = k === "desktop" ? Monitor : Smartphone;
        return (
          <div key={k} className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-ink">
                {k === "desktop" ? "Desktop poster (required)" : "Mobile poster (optional)"} · {s.ratio}:1
              </p>
              <p className="text-muted">
                Recommended {s.recommended}, minimum {s.minWidth} × {s.minHeight} px. JPEG, PNG, WebP or AVIF up to 15 MB.
                {k === "mobile" && " Without one, phones show the desktop poster."}
              </p>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

type Poster = { url: string; width: number; height: number } | null;

function AdForm({ ad, defaultSlot, nextSort, onCancel, onSaved }: { ad: AdminHomeAd | null; defaultSlot: HomeSectionType; nextSort: number; onCancel: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    title: ad?.title ?? "",
    afterSection: ad?.afterSection ?? defaultSlot,
    linkUrl: ad?.linkUrl ?? "",
    startsAt: toLocalInput(ad?.startsAt),
    endsAt: toLocalInput(ad?.endsAt),
    isActive: ad?.isActive ?? true,
  });
  const [desktop, setDesktop] = useState<Poster>(ad ? { url: ad.imageUrl, width: ad.imageWidth, height: ad.imageHeight } : null);
  const [mobile, setMobile] = useState<Poster>(
    ad?.mobileImageUrl ? { url: ad.mobileImageUrl, width: ad.mobileImageWidth ?? 0, height: ad.mobileImageHeight ?? 0 } : null,
  );
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const errs = {
    title: f.title.trim().length < 2 ? "Give the poster a name (also used as alt text)" : null,
    desktop: !desktop ? "Upload the desktop poster" : null,
    linkUrl: f.linkUrl.trim() && !/^(\/|https?:\/\/)/.test(f.linkUrl.trim()) ? "Use a site path like /search?type=VILLA or a full https:// link" : null,
    endsAt: f.startsAt && f.endsAt && f.endsAt <= f.startsAt ? "End must be after start" : null,
  };
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (Object.values(errs).some(Boolean) || !desktop) return;
        setBusy(true);
        const body = {
          title: f.title.trim(),
          afterSection: f.afterSection,
          imageUrl: desktop.url,
          imageWidth: desktop.width,
          imageHeight: desktop.height,
          mobileImageUrl: mobile?.url ?? null,
          mobileImageWidth: mobile?.width ?? null,
          mobileImageHeight: mobile?.height ?? null,
          linkUrl: nullIfEmpty(f.linkUrl),
          startsAt: fromLocalInput(f.startsAt),
          endsAt: fromLocalInput(f.endsAt),
          isActive: f.isActive,
          ...(ad ? {} : { sort: nextSort }),
        };
        try {
          await api(ad ? `/admin/home-ads/${ad.id}` : "/admin/home-ads", { method: ad ? "PATCH" : "POST", body });
          toast.success("Poster saved");
          onSaved();
        } catch (err) {
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <PosterField kind="desktop" value={desktop} onChange={setDesktop} error={touched ? errs.desktop : null} />
      <PosterField kind="mobile" value={mobile} onChange={setMobile} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required error={touched ? errs.title : null}>
          <Input value={f.title} onChange={(e) => set({ title: e.target.value })} maxLength={160} placeholder="Monsoon villa offer" />
        </Field>
        <Field label="Show after section" required>
          <Select value={f.afterSection} onChange={(e) => set({ afterSection: e.target.value as HomeSectionType })}>
            {SLOTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Link" hint="Where the poster goes when clicked (optional)" error={touched ? errs.linkUrl : null} className="sm:col-span-2">
          <Input value={f.linkUrl} onChange={(e) => set({ linkUrl: e.target.value })} placeholder="/search?type=VILLA" />
        </Field>
        <Field label="Show from" hint="Optional">
          <Input type="datetime-local" value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
        </Field>
        <Field label="Show until" hint="Optional" error={touched ? errs.endsAt : null}>
          <Input type="datetime-local" value={f.endsAt} min={f.startsAt || undefined} onChange={(e) => set({ endsAt: e.target.value })} />
        </Field>
      </div>
      <Toggle label="Active" checked={f.isActive} onChange={(v) => set({ isActive: v })} />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          Save poster
        </Button>
      </div>
    </form>
  );
}

/** Poster upload that checks the image's aspect ratio and pixel size BEFORE uploading it. */
function PosterField({ kind, value, onChange, error }: { kind: "desktop" | "mobile"; value: Poster; onChange: (p: Poster) => void; error?: string | null }) {
  const spec = HOME_AD_SPECS[kind];
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const onFile = async (file: File) => {
    const typeErr = validateFile(file, ["IMAGE"]);
    if (typeErr) return setProblem(typeErr);
    const { width, height } = await probeImage(file);
    const sizeErr = homeAdSizeError(kind, width ?? 0, height ?? 0);
    if (sizeErr) return setProblem(sizeErr);
    setProblem(null);
    setProgress(0);
    try {
      const { url } = await uploadFile(file, { ownerType: "BANNER", kind: "IMAGE", onProgress: setProgress });
      onChange({ url, width: width!, height: height! });
    } catch (e) {
      setProblem(errorMessage(e));
    } finally {
      setProgress(null);
    }
  };

  const shown = problem ?? error;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink">
          {kind === "desktop" ? "Desktop poster" : "Mobile poster"} <span className="font-normal text-muted">· {spec.ratio}:1, e.g. {spec.recommended}{kind === "mobile" && " (optional)"}</span>
        </span>
        {value && (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="size-3.5" /> {value.width} × {value.height} px fits
          </span>
        )}
      </div>
      <div
        className={`relative grid w-full place-items-center overflow-hidden rounded-lg border border-dashed bg-surface-2 ${shown ? "border-danger" : "border-line"} ${kind === "desktop" ? "aspect-[8/1]" : "aspect-[3/1] max-w-sm"}`}
      >
        {value ? <img src={value.url} alt="" className="size-full object-cover" /> : <ImageIcon className="size-6 text-muted" aria-hidden />}
        {progress !== null && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/20" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-brand" style={{ width: `${Math.max(3, progress * 100)}%` }} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => input.current?.click()} loading={progress !== null}>
          <Upload className="size-4" /> {value ? "Replace" : "Upload"}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            <Trash2 className="size-4" /> Remove
          </Button>
        )}
      </div>
      {shown && (
        <p role="alert" className="text-xs text-danger">
          {shown}
        </p>
      )}
      <input
        ref={input}
        type="file"
        className="sr-only"
        aria-label={`Upload ${kind} poster`}
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
