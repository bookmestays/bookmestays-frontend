"use client";
/* eslint-disable @next/next/no-img-element -- media comes from S3/local dev storage with arbitrary hosts */

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Camera, Film, GripVertical, ImageIcon, Pencil, Star, Trash2, UploadCloud, X } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { errorMessage, useApi } from "@/lib/use-api";
import type { Media, MediaKind, MediaOwnerType, MediaTag } from "@/lib/types";
import { Badge, Button, Field, Input, Modal, Select, Skeleton, Textarea, useToast, ErrorState } from "@/components/ui";
import { ConfirmDialog } from "./confirm-dialog";
import { MEDIA_TAG_LABELS } from "./labels";
import { drawVideoFrame, uploadFile, uploadMedia, validateFile } from "./media-upload";

type Upload = { id: string; name: string; progress: number; error?: string; kind: MediaKind };

const sortMedia = (m: Media[]) => [...m].sort((a, b) => a.sort - b.sort);

/**
 * Upload & manage media for one owner (property, room type, nearby place, experience…).
 * Drag-drop multi upload with progress, tag, caption, cover, reorder (drag or arrow buttons), delete,
 * and client-side video poster capture.
 */
export function MediaManager({
  ownerType,
  ownerId,
  kinds = ["IMAGE", "VIDEO"],
  tags = Object.keys(MEDIA_TAG_LABELS) as MediaTag[],
  defaultTag,
  allowCover = true,
  readOnly = false,
  minImages,
  title,
}: {
  ownerType: MediaOwnerType;
  ownerId: string | null;
  kinds?: MediaKind[];
  tags?: MediaTag[];
  defaultTag?: MediaTag;
  allowCover?: boolean;
  readOnly?: boolean;
  minImages?: number;
  title?: string;
}) {
  const toast = useToast();
  const { data, error, loading, refetch, mutate } = useApi<Media[]>(ownerId ? "/media" : null, { ownerType, ownerId });
  const items = sortMedia(data ?? []);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Media | null>(null);
  const [posterFor, setPosterFor] = useState<Media | null>(null);
  const [deleting, setDeleting] = useState<Media | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const setItems = (next: Media[]) => mutate(() => next);

  if (!ownerId) {
    return <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">Save first — media can be added once this item exists.</p>;
  }

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    for (const f of list) {
      const err = validateFile(f, kinds);
      if (err) toast.error(err);
    }
    const ok = list.filter((f) => !validateFile(f, kinds));
    // sequential keeps bandwidth predictable for large videos
    for (const file of ok) {
      const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
      const kind: MediaKind = file.type.startsWith("video") ? "VIDEO" : "IMAGE";
      setUploads((u) => [...u, { id, name: file.name, progress: 0, kind }]);
      try {
        const media = await uploadMedia(file, {
          ownerType,
          ownerId,
          tag: defaultTag ?? (kind === "VIDEO" ? (tags.includes("ROOM_WALKTHROUGH") ? "ROOM_WALKTHROUGH" : tags[0]) : tags.includes("OTHER") ? "OTHER" : tags[0]),
          onProgress: (p) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, progress: p } : x))),
        });
        mutate((prev) => [...(prev ?? []), media]);
        setUploads((u) => u.filter((x) => x.id !== id));
      } catch (e) {
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, error: errorMessage(e) } : x)));
      }
    }
  };

  const patch = async (m: Media, body: Partial<Pick<Media, "tag" | "title" | "caption" | "isCover" | "posterUrl">>) => {
    try {
      const updated = await api<Media>(`/media/${m.id}`, { method: "PATCH", body });
      let next = items.map((x) => (x.id === m.id ? { ...x, ...updated } : x));
      if (body.isCover) next = next.map((x) => (x.id !== m.id && x.kind === m.kind ? { ...x, isCover: false } : x));
      setItems(next);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };

  const reorder = async (next: Media[]) => {
    const prev = items;
    const withSort = next.map((m, i) => ({ ...m, sort: i }));
    setItems(withSort);
    try {
      await api("/media/reorder", { method: "PUT", body: { ids: withSort.map((m) => m.id) } });
    } catch (e) {
      setItems(prev);
      toast.error(errorMessage(e));
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    reorder(next);
  };

  const onDropReorder = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = items.findIndex((m) => m.id === dragId);
    const to = items.findIndex((m) => m.id === targetId);
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    reorder(next);
  };

  const imageCount = items.filter((m) => m.kind === "IMAGE").length;
  const accept = [...(kinds.includes("IMAGE") ? ["image/jpeg", "image/png", "image/webp", "image/avif"] : []), ...(kinds.includes("VIDEO") ? ["video/mp4", "video/quicktime", "video/webm"] : [])].join(",");

  return (
    <div className="space-y-4">
      {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
      {!readOnly && (
        <div
          onDragOver={(e: DragEvent) => {
            if (dragId) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e: DragEvent) => {
            if (dragId) return;
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
            dragOver ? "border-brand bg-brand-soft/50" : "border-line bg-surface-2/50",
          )}
        >
          <UploadCloud className="size-8 text-muted" aria-hidden />
          <p className="text-sm text-ink">
            Drag & drop {kinds.length === 2 ? "photos or videos" : kinds[0] === "IMAGE" ? "photos" : "videos"} here, or{" "}
            <button type="button" className="font-medium text-brand hover:underline" onClick={() => fileInput.current?.click()}>
              browse
            </button>
          </p>
          <p className="text-xs text-muted">
            {kinds.includes("IMAGE") && "Images: JPEG/PNG/WebP/AVIF up to 15 MB. "}
            {kinds.includes("VIDEO") && "Videos: MP4/MOV/WebM up to 500 MB — a poster frame is captured automatically."}
          </p>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={accept}
            className="sr-only"
            aria-label="Upload files"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {uploads.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.id} className="rounded-lg border border-line bg-white p-3 text-sm">
              <div className="flex items-center gap-2">
                {u.kind === "VIDEO" ? <Film className="size-4 text-muted" /> : <ImageIcon className="size-4 text-muted" />}
                <span className="flex-1 truncate">{u.name}</span>
                {u.error ? (
                  <button type="button" aria-label="Dismiss" onClick={() => setUploads((x) => x.filter((y) => y.id !== u.id))} className="text-muted hover:text-ink">
                    <X className="size-4" />
                  </button>
                ) : (
                  <span className="text-xs text-muted tabular-nums">{Math.round(u.progress * 100)}%</span>
                )}
              </div>
              {u.error ? (
                <p className="mt-1 text-xs text-danger">{u.error}</p>
              ) : (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(u.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${u.name}`}>
                  <div className="h-full bg-brand transition-all" style={{ width: `${Math.max(3, u.progress * 100)}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {minImages && imageCount < minImages && (
        <p className="text-xs text-warning">
          Add at least {minImages} photos ({imageCount} so far).
        </p>
      )}

      {error && !data ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : loading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">No media yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Media items">
          {items.map((m, idx) => (
            <li
              key={m.id}
              draggable={!readOnly}
              onDragStart={(e) => {
                setDragId(m.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => dragId && e.preventDefault()}
              onDrop={(e) => {
                if (!dragId) return;
                e.preventDefault();
                onDropReorder(m.id);
              }}
              className={cn("group overflow-hidden rounded-xl border bg-white", dragId === m.id ? "border-brand opacity-50" : "border-line", m.isCover && "ring-2 ring-brand")}
            >
              <div className="relative aspect-[4/3] bg-surface-2">
                {m.kind === "IMAGE" ? (
                  <img src={m.url} alt={m.caption ?? m.title ?? ""} className="size-full object-cover" loading="lazy" />
                ) : m.posterUrl ? (
                  <img src={m.posterUrl} alt={m.caption ?? m.title ?? "Video poster"} className="size-full object-cover" loading="lazy" />
                ) : (
                  <video src={m.url} muted preload="metadata" className="size-full object-cover" />
                )}
                <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1">
                  {m.kind === "VIDEO" && (
                    <Badge className="bg-black/70 text-white">
                      <Film className="size-3" /> {m.durationSec ? `${Math.floor(m.durationSec / 60)}:${String(m.durationSec % 60).padStart(2, "0")}` : "Video"}
                    </Badge>
                  )}
                  {m.isCover && (
                    <Badge className="bg-brand text-white">
                      <Star className="size-3" /> Cover
                    </Badge>
                  )}
                </div>
                {!readOnly && (
                  <span className="absolute top-1.5 right-1.5 hidden cursor-grab rounded bg-white/90 p-1 text-muted group-hover:block" aria-hidden>
                    <GripVertical className="size-4" />
                  </span>
                )}
              </div>
              <div className="space-y-2 p-2">
                {readOnly ? (
                  <p className="truncate text-xs text-muted">{MEDIA_TAG_LABELS[m.tag]}</p>
                ) : (
                  <Select aria-label="Tag" className="h-8 text-xs" value={m.tag} onChange={(e) => patch(m, { tag: e.target.value as MediaTag })}>
                    {(tags.includes(m.tag) ? tags : [m.tag, ...tags]).map((t) => (
                      <option key={t} value={t}>
                        {MEDIA_TAG_LABELS[t]}
                      </option>
                    ))}
                  </Select>
                )}
                {m.caption && <p className="line-clamp-2 text-xs text-ink-2">{m.caption}</p>}
                {!readOnly && (
                  <div className="flex flex-wrap items-center gap-0.5">
                    <IconBtn label="Move earlier" onClick={() => move(idx, -1)} disabled={idx === 0}>
                      <ArrowLeft />
                    </IconBtn>
                    <IconBtn label="Move later" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}>
                      <ArrowRight />
                    </IconBtn>
                    <IconBtn label="Edit title & caption" onClick={() => setEditing(m)}>
                      <Pencil />
                    </IconBtn>
                    {m.kind === "VIDEO" && (
                      <IconBtn label="Capture poster frame" onClick={() => setPosterFor(m)}>
                        <Camera />
                      </IconBtn>
                    )}
                    {allowCover && !m.isCover && (
                      <IconBtn label={m.kind === "VIDEO" ? "Set as preview video" : "Set as cover photo"} onClick={() => patch(m, { isCover: true })}>
                        <Star />
                      </IconBtn>
                    )}
                    <IconBtn label="Delete" onClick={() => setDeleting(m)} className="ml-auto hover:text-danger">
                      <Trash2 />
                    </IconBtn>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit media details" size="sm">
        {editing && <CaptionForm media={editing} onCancel={() => setEditing(null)} onSave={async (b) => (await patch(editing, b)) && setEditing(null)} />}
      </Modal>
      <Modal open={!!posterFor} onClose={() => setPosterFor(null)} title="Choose poster frame" size="lg">
        {posterFor && (
          <PosterCapture
            media={posterFor}
            onDone={async (url) => {
              if (await patch(posterFor, { posterUrl: url })) {
                toast.success("Poster updated");
                setPosterFor(null);
              }
            }}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete media?"
        description="This permanently removes the file. This can't be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => {
          if (!deleting) return;
          await api(`/media/${deleting.id}`, { method: "DELETE" });
          setItems(items.filter((x) => x.id !== deleting.id));
          toast.success("Deleted");
        }}
      />
    </div>
  );
}

function IconBtn({ label, children, className, ...p }: { label: string; children: ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button type="button" title={label} aria-label={label} className={cn("rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30 [&_svg]:size-3.5", className)} {...p}>
      {children}
    </button>
  );
}

function CaptionForm({ media, onSave, onCancel }: { media: Media; onSave: (b: { title: string; caption: string }) => Promise<unknown>; onCancel: () => void }) {
  const [title, setTitle] = useState(media.title ?? "");
  const [caption, setCaption] = useState(media.caption ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSave({ title: title.trim(), caption: caption.trim() });
        setBusy(false);
      }}
    >
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      </Field>
      <Field label="Caption" hint="Shown to guests under the photo/video. Also used as image alt text.">
        <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} maxLength={300} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          Save
        </Button>
      </div>
    </form>
  );
}

/** Scrub a video and capture the current frame as the poster image. */
export function PosterCapture({ media, onDone }: { media: Pick<Media, "url" | "ownerType" | "ownerId">; onDone: (posterUrl: string) => Promise<unknown> }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <video ref={ref} src={media.url} controls crossOrigin="anonymous" playsInline muted className="aspect-video w-full rounded-lg bg-black" />
      <p className="text-sm text-muted">Pause the video on the frame you want, then capture it.</p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button
          loading={busy}
          onClick={async () => {
            const v = ref.current;
            if (!v) return;
            setBusy(true);
            setError(null);
            try {
              v.pause();
              const blob = await drawVideoFrame(v);
              const { url } = await uploadFile(blob, { ownerType: media.ownerType, ownerId: media.ownerId, kind: "IMAGE", fileName: "poster.jpg" });
              await onDone(url);
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Camera className="size-4" /> Use this frame
        </Button>
      </div>
    </div>
  );
}
