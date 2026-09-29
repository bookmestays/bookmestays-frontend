"use client";

import { Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { ExperienceCard as ExperienceCardDTO } from "@/lib/types";
import { formatDuration } from "../constants";
import { SmartImage } from "../media/smart-image";
import { SmartVideo } from "../media/smart-video";
import { PriceTag, RatingBadge } from "../primitives";
import { WishlistButton } from "../wishlist-context";

export function ExperienceCard({ e, className }: { e: ExperienceCardDTO; className?: string }) {
  const [hovered, setHovered] = useState(false);
  const duration = formatDuration(e.durationMinutes);
  return (
    <article
      className={cn("group relative flex flex-col", className)}
      onPointerEnter={(ev) => ev.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-2">
        {e.previewVideoUrl ? (
          <SmartVideo
            src={e.previewVideoUrl}
            poster={e.coverImageUrl}
            alt={`Preview of ${e.title}`}
            trigger="hover"
            active={hovered}
            sizes="(max-width: 640px) 82vw, 320px"
            className="absolute inset-0"
          />
        ) : (
          <SmartImage src={e.coverImageUrl} alt={e.title} fill sizes="(max-width: 640px) 82vw, 320px" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        )}
        <WishlistButton type="EXPERIENCE" id={e.id} name={e.title} className="absolute top-2 right-2 z-10" />
        {e.isBookable && (
          <span className="absolute top-2 left-2 rounded-md bg-success px-2 py-0.5 text-[11px] font-semibold text-white">Bookable</span>
        )}
      </div>
      <div className="mt-2.5 flex flex-col gap-1">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold text-ink">
          <Link href={`/experiences/${e.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none group-focus-within:underline">
            {e.title}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {e.cityName && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden /> {e.cityName}
            </span>
          )}
          {duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden /> {duration}
            </span>
          )}
          {e.ratingCount > 0 && <RatingBadge value={e.ratingAvg} />}
        </div>
        {e.price != null && <PriceTag paise={e.price} suffix="/person" />}
      </div>
    </article>
  );
}
