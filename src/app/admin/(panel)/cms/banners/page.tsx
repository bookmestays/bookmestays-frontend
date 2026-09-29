"use client";
/* eslint-disable @next/next/no-img-element -- arbitrary storage hosts */

import { useState } from "react";
import { ArrowDown, ArrowUp, Film, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import type { AdminBanner } from "@/lib/panel-types";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, Skeleton, Textarea, useToast } from "@/components/ui";
import { PageHeader } from "@/components/panel/page";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { Toggle } from "@/components/panel/inputs";
import { MediaUrlField } from "@/components/panel/media-field";
import { asList, fromLocalInput, nullIfEmpty, toLocalInput } from "@/components/panel/util";
import { formatDateTime } from "@/components/panel/labels";

export default function BannersPage() {
  const toast = useToast();
  const { data, error, loading, refetch, mutate } = useApi<AdminBanner[] | { items: AdminBanner[] }>("/admin/banners");
  const banners = asList(data).sort((a, b) => a.sort - b.sort);
  const [editing, setEditing] = useState<AdminBanner | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminBanner | null>(null);

  const patch = async (b: AdminBanner, body: Partial<AdminBanner>) => {
    try {
      await api(`/admin/banners/${b.id}`, { method: "PATCH", body });
      mutate((prev) => asList(prev).map((x) => (x.id === b.id ? { ...x, ...body } : x)));
    } catch (e) {
      toast.error(errorMessage(e));
      refetch();
    }
  };

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= banners.length) return;
    const order = [...banners];
    [order[i], order[j]] = [order[j], order[i]];
    mutate(() => order.map((b, k) => ({ ...b, sort: k })));
    try {
      await Promise.all(order.map((b, k) => (b.sort !== k ? api(`/admin/banners/${b.id}`, { method: "PATCH", body: { sort: k } }) : null)));
    } catch (e) {
      toast.error(errorMessage(e));
      refetch();
    }
  };

  return (
    <>
      <PageHeader
        title="Hero banners"
        description="Homepage hero videos. Active banners inside their schedule rotate in this order."
        breadcrumbs={[{ label: "CMS" }, { label: "Hero banners" }]}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> New banner
          </Button>
        }
      />
      {error && !data ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : loading && !data ? (
        <Skeleton className="h-48" />
      ) : banners.length === 0 ? (
        <Card>
          <EmptyState icon={<Film />} title="No banners yet" description="Upload a short hero video (MP4, ideally < 20 MB, 16:9) with a poster image." />
        </Card>
      ) : (
        <ul className="space-y-3">
          {banners.map((b, i) => (
            <li key={b.id}>
              <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:w-48">
                  {b.posterUrl ? <img src={b.posterUrl} alt="" className="size-full object-cover" /> : <Film className="absolute inset-0 m-auto size-6 text-muted" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{b.title}</p>
                    {!b.videoUrl && <Badge tone="warning">No video</Badge>}
                  </div>
                  {b.subtitle && <p className="line-clamp-1 text-sm text-ink-2">{b.subtitle}</p>}
                  <p className="text-xs text-muted">
                    {b.ctaLabel ? `CTA “${b.ctaLabel}” → ${b.ctaUrl ?? "—"}` : "No CTA"}
                    {(b.startsAt || b.endsAt) && ` · ${b.startsAt ? formatDateTime(b.startsAt) : "now"} → ${b.endsAt ? formatDateTime(b.endsAt) : "no end"}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="mr-2 w-24">
                    <Toggle label="Active" checked={b.isActive} onChange={(v) => patch(b, { isActive: v })} />
                  </div>
                  <Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" aria-label="Move down" disabled={i === banners.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setEditing(b)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" aria-label="Delete" className="hover:text-danger" onClick={() => setDeleting(b)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New banner" : "Edit banner"} size="lg">
        {editing && (
          <BannerForm
            banner={editing === "new" ? null : editing}
            nextSort={banners.length}
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
        title="Delete banner?"
        tone="danger"
        confirmLabel="Delete"
        onConfirm={async () => {
          await api(`/admin/banners/${deleting?.id}`, { method: "DELETE" });
          toast.success("Banner deleted");
          refetch();
        }}
      />
    </>
  );
}

function BannerForm({ banner, nextSort, onCancel, onSaved }: { banner: AdminBanner | null; nextSort: number; onCancel: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    title: banner?.title ?? "",
    subtitle: banner?.subtitle ?? "",
    videoUrl: banner?.videoUrl ?? null,
    posterUrl: banner?.posterUrl ?? null,
    ctaLabel: banner?.ctaLabel ?? "",
    ctaUrl: banner?.ctaUrl ?? "",
    startsAt: toLocalInput(banner?.startsAt),
    endsAt: toLocalInput(banner?.endsAt),
    isActive: banner?.isActive ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const errs = {
    title: f.title.trim().length < 2 ? "Title is required" : null,
    videoUrl: !f.videoUrl ? "Upload the hero video" : null,
    endsAt: f.startsAt && f.endsAt && f.endsAt <= f.startsAt ? "End must be after start" : null,
    ctaUrl: f.ctaLabel.trim() && !f.ctaUrl.trim() ? "Add a link for the CTA" : null,
  };
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (Object.values(errs).some(Boolean)) return;
        setBusy(true);
        const body = {
          title: f.title.trim(),
          subtitle: nullIfEmpty(f.subtitle),
          videoUrl: f.videoUrl,
          posterUrl: f.posterUrl,
          ctaLabel: nullIfEmpty(f.ctaLabel),
          ctaUrl: nullIfEmpty(f.ctaUrl),
          startsAt: fromLocalInput(f.startsAt),
          endsAt: fromLocalInput(f.endsAt),
          isActive: f.isActive,
          ...(banner ? {} : { sort: nextSort }),
        };
        try {
          await api(banner ? `/admin/banners/${banner.id}` : "/admin/banners", { method: banner ? "PATCH" : "POST", body });
          toast.success("Banner saved");
          onSaved();
        } catch (err) {
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <MediaUrlField
        kind="VIDEO"
        ownerType="BANNER"
        ownerId={banner?.id ?? null}
        label="Hero video"
        value={f.videoUrl}
        posterUrl={f.posterUrl}
        onChange={(u) => set({ videoUrl: u })}
        onPoster={(u) => set({ posterUrl: u })}
      />
      {touched && errs.videoUrl && <p className="text-xs text-danger">{errs.videoUrl}</p>}
      <MediaUrlField kind="IMAGE" ownerType="BANNER" ownerId={banner?.id ?? null} label="Poster image (shown while the video loads)" value={f.posterUrl} onChange={(u) => set({ posterUrl: u })} />
      <Field label="Title" required error={touched ? errs.title : null}>
        <Input value={f.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} />
      </Field>
      <Field label="Subtitle">
        <Textarea rows={2} value={f.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CTA label">
          <Input value={f.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} maxLength={60} placeholder="Explore Goa villas" />
        </Field>
        <Field label="CTA link" error={touched ? errs.ctaUrl : null}>
          <Input value={f.ctaUrl} onChange={(e) => set({ ctaUrl: e.target.value })} placeholder="/search?city=goa&type=VILLA" />
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
          Save banner
        </Button>
      </div>
    </form>
  );
}
