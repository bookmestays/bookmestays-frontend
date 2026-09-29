"use client";

import { ChevronLeft, ChevronRight, Images, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import type { Media } from "@/lib/types";
import { MEDIA_TAG_LABELS } from "../constants";
import { SmartImage } from "../media/smart-image";
import { SmartVideo } from "../media/smart-video";

/** <video controls> with poster fallback when the file can't be played. */
function Player({ m, autoPlay, className, onPlay, onEnded }: { m: Media; autoPlay?: boolean; className?: string; onPlay?: () => void; onEnded?: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        <SmartImage src={m.posterUrl} alt={m.title ?? "Video poster"} fill sizes="100vw" className="object-contain opacity-60" />
        <p className="relative rounded-lg bg-black/70 px-3 py-2 text-sm text-white">This video is unavailable right now.</p>
      </div>
    );
  }
  return (
    <video
      src={m.url}
      poster={m.posterUrl ?? undefined}
      controls
      autoPlay={autoPlay}
      playsInline
      className={className}
      onPlay={onPlay}
      onEnded={onEnded}
      onError={() => setFailed(true)}
    >
      <track kind="captions" />
    </video>
  );
}

/** Full-screen media viewer (images + videos with controls). */
export function MediaLightbox({
  media,
  startIndex = 0,
  title,
  onClose,
  propertyId,
}: {
  media: Media[];
  startIndex?: number;
  title: string;
  onClose: () => void;
  propertyId?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(startIndex);
  const count = media.length;
  const m = media[index];

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const go = (d: number) => setIndex((i) => (i + d + count) % count);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={`${title} — photos and videos`}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="min-w-0 truncate text-sm">
            <span className="font-semibold">{title}</span>
            <span className="text-white/60">
              {" "}
              · {index + 1} / {count}
              {m?.tag ? ` · ${m.title ?? MEDIA_TAG_LABELS[m.tag]}` : ""}
            </span>
          </p>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Close gallery" className="rounded-full p-2 hover:bg-white/10">
            <X className="size-6" aria-hidden />
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
          {m &&
            (m.kind === "VIDEO" ? (
              <Player
                key={m.id}
                m={m}
                autoPlay
                className="h-full max-h-full w-full max-w-full rounded-lg object-contain"
                onPlay={() => track("video_played", { propertyId, mediaId: m.id, source: "gallery" })}
                onEnded={() => track("video_completed", { propertyId, mediaId: m.id, source: "gallery" })}
              />
            ) : (
              <div className="relative h-full w-full">
                <SmartImage key={m.id} src={m.url} alt={m.caption ?? m.title ?? title} fill sizes="100vw" className="object-contain" />
              </div>
            ))}
          {count > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:left-4">
                <ChevronLeft className="size-6" aria-hidden />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next" className="absolute right-2 flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:right-4">
                <ChevronRight className="size-6" aria-hidden />
              </button>
            </>
          )}
        </div>
        {m?.caption && <p className="px-4 pt-2 text-center text-sm text-white/80">{m.caption}</p>}
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
          {media.map((x, i) => (
            <li key={x.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show item ${i + 1}`}
                aria-current={i === index}
                className={cn("relative block h-14 w-20 overflow-hidden rounded-md border-2", i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100")}
              >
                <SmartImage src={x.kind === "VIDEO" ? x.posterUrl : x.url} alt="" fill sizes="80px" className="object-cover" />
                {x.kind === "VIDEO" && <Play className="absolute inset-0 m-auto size-5 fill-white text-white drop-shadow" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}

/** Top-of-page gallery: lead video (if any) + image grid, opens the lightbox. */
export function PropertyGallery({ media, name, propertyId }: { media: Media[]; name: string; propertyId: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const video = media.find((m) => m.kind === "VIDEO");
  const images = media.filter((m) => m.kind === "IMAGE");
  const cover = images.find((m) => m.isCover) ?? images[0];
  const lead = video ?? cover;
  const rest = images.filter((m) => m !== lead);
  const thumbs = rest.slice(0, rest.length >= 4 ? 4 : rest.length >= 2 ? 2 : 0);
  const openAt = (m: Media | undefined) => setOpen(Math.max(0, m ? media.indexOf(m) : 0));

  if (!lead) {
    return (
      <div className="flex aspect-[16/7] items-center justify-center rounded-2xl bg-surface-2 text-sm text-muted">Photos coming soon</div>
    );
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "grid gap-2 overflow-hidden rounded-2xl md:h-[420px] md:grid-rows-2 lg:h-[480px]",
          thumbs.length === 4 ? "md:grid-cols-4" : thumbs.length === 2 ? "md:grid-cols-3" : "md:grid-cols-1",
        )}
      >
        <button
          type="button"
          onClick={() => openAt(lead)}
          className={cn(
            "relative aspect-[16/10] overflow-hidden bg-surface-2 md:row-span-2 md:aspect-auto",
            thumbs.length ? "md:col-span-2" : "md:col-span-1",
          )}
          aria-label={`Open gallery for ${name}`}
        >
          {lead.kind === "VIDEO" ? (
            <SmartVideo
              src={lead.url}
              hlsUrl={lead.hlsUrl}
              poster={lead.posterUrl ?? cover?.url}
              alt={`Video tour of ${name}`}
              trigger="auto"
              eagerPoster
              sizes="(max-width: 768px) 100vw, 50vw"
              className="absolute inset-0"
              onPlayStart={() => track("video_played", { propertyId, mediaId: lead.id, source: "detail_hero" })}
            />
          ) : (
            <SmartImage src={lead.url} alt={lead.caption ?? name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" loading="eager" fetchPriority="high" />
          )}
          {lead.kind === "VIDEO" && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
              <Play className="size-3 fill-current" aria-hidden /> {lead.title ?? MEDIA_TAG_LABELS[lead.tag]}
            </span>
          )}
        </button>
        {thumbs.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => openAt(m)}
            className="relative hidden overflow-hidden bg-surface-2 md:block"
            aria-label={`Open photo ${i + 2}`}
          >
            <SmartImage src={m.url} alt={m.caption ?? `${name} photo ${i + 2}`} fill sizes="25vw" className="object-cover transition-transform duration-500 hover:scale-105" />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen(0)}
        className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-ink shadow-md hover:bg-surface-2"
      >
        <Images className="size-4" aria-hidden /> View all {media.length}
      </button>
      {open !== null && <MediaLightbox media={media} startIndex={open} title={name} onClose={() => setOpen(null)} propertyId={propertyId} />}
    </div>
  );
}

/** "Property videos / walkthroughs" section — inline players labelled by tag. */
export function PropertyVideos({ videos, name, propertyId }: { videos: Media[]; name: string; propertyId: string }) {
  const [playing, setPlaying] = useState<string | null>(null);
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => (
        <li key={v.id}>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-ink">
            {playing === v.id ? (
              <Player
                m={v}
                autoPlay
                className="h-full w-full object-contain"
                onPlay={() => track("video_played", { propertyId, mediaId: v.id, source: "detail_videos" })}
                onEnded={() => track("video_completed", { propertyId, mediaId: v.id, source: "detail_videos" })}
              />
            ) : (
              <button type="button" onClick={() => setPlaying(v.id)} className="group absolute inset-0" aria-label={`Play ${v.title ?? MEDIA_TAG_LABELS[v.tag]} video`}>
                <SmartImage src={v.posterUrl} alt={`${v.title ?? MEDIA_TAG_LABELS[v.tag]} at ${name}`} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover opacity-90" />
                <span className="absolute inset-0 m-auto flex size-14 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg transition-transform group-hover:scale-110">
                  <Play className="ml-1 size-6 fill-current" aria-hidden />
                </span>
                {v.durationSec ? (
                  <span className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                    {Math.floor(v.durationSec / 60)}:{String(Math.round(v.durationSec % 60)).padStart(2, "0")}
                  </span>
                ) : null}
              </button>
            )}
          </div>
          <p className="mt-2 text-sm font-medium text-ink">{v.title ?? MEDIA_TAG_LABELS[v.tag]}</p>
          <p className="text-xs text-muted">{MEDIA_TAG_LABELS[v.tag]}</p>
          {v.caption && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{v.caption}</p>}
        </li>
      ))}
    </ul>
  );
}
