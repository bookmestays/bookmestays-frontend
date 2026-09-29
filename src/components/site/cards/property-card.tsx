"use client";

import { MapPin, PlayCircle, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import type { PropertyCard as PropertyCardDTO } from "@/lib/types";
import { locationLine, TYPE_SINGULAR } from "../constants";
import { SmartImage } from "../media/smart-image";
import { SmartVideo } from "../media/smart-video";
import { PriceTag, RatingBadge } from "../primitives";
import { WishlistButton } from "../wishlist-context";

function Media({ p, hovered, sizes, eager }: { p: PropertyCardDTO; hovered: boolean; sizes: string; eager?: boolean }) {
  if (p.previewVideoUrl) {
    return (
      <SmartVideo
        src={p.previewVideoUrl}
        poster={p.previewVideoPosterUrl ?? p.coverImageUrl}
        alt={`Preview video of ${p.name}`}
        trigger="hover"
        active={hovered}
        sizes={sizes}
        eagerPoster={eager}
        className="absolute inset-0"
        onPlayStart={() => track("video_played", { propertyId: p.id, source: "card" })}
      />
    );
  }
  return (
    <SmartImage
      src={p.coverImageUrl}
      alt={p.name}
      fill
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
    />
  );
}

/** Tall 4:5 poster card for the discovery rows. */
export function PropertyPosterCard({ p, query = "", eager, className }: { p: PropertyCardDTO; query?: string; eager?: boolean; className?: string }) {
  const [hovered, setHovered] = useState(false);
  const href = `/stays/${p.slug}${query}`;
  return (
    <article
      className={cn("group relative flex flex-col", className)}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2 shadow-sm">
        <Media p={p} hovered={hovered} sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 240px" eager={eager} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute top-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-sm backdrop-blur">
          {TYPE_SINGULAR[p.type]}
        </span>
        {p.previewVideoUrl && (
          <PlayCircle className="absolute bottom-2 left-2 size-5 text-white drop-shadow" aria-label="Has video preview" />
        )}
        {p.ratingAvg > 0 && (
          <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-ink shadow-sm backdrop-blur">
            <Star className="size-3 fill-rating text-rating" aria-hidden />
            {p.ratingAvg.toFixed(1)}
            <span className="sr-only">out of 5</span>
          </span>
        )}
        <WishlistButton type="PROPERTY" id={p.id} name={p.name} className="absolute top-2 right-2 z-10" />
      </div>
      <div className="mt-2.5 flex min-w-0 flex-col gap-0.5">
        <h3 className="truncate text-[15px] font-semibold text-ink">
          <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none group-focus-within:underline">
            {p.name}
          </Link>
        </h3>
        <p className="flex items-center gap-1 truncate text-xs text-muted">
          <MapPin className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{locationLine(p) || "India"}</span>
        </p>
        <PriceTag paise={p.price} className="mt-0.5" />
      </div>
    </article>
  );
}

/** Horizontal list card for search results / listings. */
export function PropertyListCard({ p, query = "", eager }: { p: PropertyCardDTO; query?: string; eager?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const href = `/stays/${p.slug}${query}`;
  const chips = [...p.highlights.slice(0, 2), ...p.amenities.map((a) => a.name)].slice(0, 4);
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-md sm:flex-row"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-surface-2 sm:aspect-auto sm:w-72 lg:w-80">
        <Media p={p} hovered={hovered} sizes="(max-width: 640px) 100vw, 320px" eager={eager} />
        <WishlistButton type="PROPERTY" id={p.id} name={p.name} className="absolute top-2 right-2 z-10" />
        {p.previewVideoUrl && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
            <PlayCircle className="size-3.5" aria-hidden /> Video tour
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-brand uppercase">
              {TYPE_SINGULAR[p.type]}
              {p.starRating ? ` · ${p.starRating}★` : ""}
            </p>
            <h3 className="mt-0.5 text-lg leading-snug font-semibold text-ink">
              <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none group-focus-within:underline">
                {p.name}
              </Link>
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {locationLine(p) || "India"}
            </p>
          </div>
          <RatingBadge value={p.ratingAvg} count={p.ratingCount} className="shrink-0" />
        </div>
        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Highlights">
            {chips.map((c) => (
              <li key={c} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-2">
                {c}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <PriceTag paise={p.price} />
          <span className="hidden rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors group-hover:bg-brand-hover sm:inline-block" aria-hidden>
            View stay
          </span>
        </div>
      </div>
    </article>
  );
}

