"use client";

import { MapPin, Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import type { VideoFeedItem } from "@/lib/types";
import { SmartVideo } from "../media/smart-video";
import { PriceTag } from "../primitives";
import { locationLine, MEDIA_TAG_LABELS } from "../constants";

/** 16:9 video discovery card: preview plays on hover (desktop) / when centred (mobile). Click → property page. */
export function VideoCard({ item, className }: { item: VideoFeedItem; className?: string }) {
  const { media, property: p } = item;
  const [hovered, setHovered] = useState(false);
  return (
    <article
      className={cn("group relative", className)}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-ink">
        <SmartVideo
          src={media.url}
          hlsUrl={media.hlsUrl}
          poster={media.posterUrl ?? p.coverImageUrl}
          alt={`${media.title ?? MEDIA_TAG_LABELS[media.tag]} at ${p.name}`}
          trigger="hover"
          active={hovered}
          sizes="(max-width: 640px) 82vw, 420px"
          className="absolute inset-0"
          onPlayStart={() => track("video_played", { propertyId: p.id, mediaId: media.id, source: "video_discovery" })}
          onComplete={() => track("video_completed", { propertyId: p.id, mediaId: media.id, source: "video_discovery" })}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
        <span className="absolute top-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
          {media.title ?? MEDIA_TAG_LABELS[media.tag]}
        </span>
        <span className="pointer-events-none absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-lg transition-opacity group-hover:opacity-0">
          <Play className="ml-0.5 size-5 fill-current" aria-hidden />
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <h3 className="truncate text-base font-semibold">
            <Link href={`/stays/${p.slug}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none group-focus-within:underline">
              {p.name}
            </Link>
          </h3>
          <p className="flex items-center gap-1 truncate text-xs text-white/85">
            <MapPin className="size-3" aria-hidden /> {locationLine(p) || "India"}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <PriceTag paise={p.price} />
        {media.durationSec ? <span className="text-xs text-muted">{Math.max(1, Math.round(media.durationSec))}s</span> : null}
      </div>
    </article>
  );
}
