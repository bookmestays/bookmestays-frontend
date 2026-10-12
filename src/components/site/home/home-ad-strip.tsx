"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { HomeAd } from "@/lib/types";
import { Container } from "../primitives";

const ROTATE_MS = 6000;

/**
 * Admin-managed advertising poster(s) between home sections. Posters are
 * validated on upload to exactly fit this slot (desktop 8:1, optional mobile
 * 3:1), so nothing gets cropped. Several posters in one slot cross-fade.
 */
export function HomeAdStrip({ ads }: { ads: HomeAd[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = ads.length;

  useEffect(() => {
    if (count < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [count, paused]);

  if (!count) return null;
  // Mobile uses the 3:1 art only when every poster in the slot has one, so the slot never changes height.
  const allMobile = ads.every((a) => a.mobileImageUrl);
  const current = index % count;

  return (
    <aside aria-label="Offers" className="py-4 sm:py-6">
      <Container>
        <div
          className={cn("relative overflow-hidden rounded-2xl bg-surface-2 shadow-sm", allMobile ? "aspect-[3/1] sm:aspect-[8/1]" : "aspect-[8/1]")}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {ads.map((ad, i) => {
            const active = i === current;
            const picture = (
              <picture>
                {allMobile && <source media="(max-width: 639px)" srcSet={ad.mobileImageUrl!} />}
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-700 group-hover/ad:scale-[1.01]"
                />
              </picture>
            );
            const cls = cn(
              "group/ad absolute inset-0 block transition-opacity duration-700",
              active ? "opacity-100" : "pointer-events-none opacity-0",
            );
            if (!ad.linkUrl) return <div key={ad.id} className={cls} aria-hidden={!active}>{picture}</div>;
            const external = /^https?:\/\//.test(ad.linkUrl);
            return external ? (
              <a key={ad.id} href={ad.linkUrl} target="_blank" rel="noopener sponsored" className={cls} tabIndex={active ? 0 : -1} aria-hidden={!active}>
                {picture}
              </a>
            ) : (
              <Link key={ad.id} href={ad.linkUrl} className={cls} tabIndex={active ? 0 : -1} aria-hidden={!active}>
                {picture}
              </Link>
            );
          })}

          {count > 1 && (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/25 px-2 py-1 backdrop-blur-sm">
              {ads.map((ad, i) => (
                <button
                  key={ad.id}
                  type="button"
                  aria-label={`Show offer ${i + 1} of ${count}`}
                  aria-current={i === current}
                  onClick={() => setIndex(i)}
                  className={cn("h-1.5 rounded-full bg-white transition-all", i === current ? "w-5" : "w-1.5 opacity-60 hover:opacity-100")}
                />
              ))}
            </div>
          )}
        </div>
      </Container>
    </aside>
  );
}
