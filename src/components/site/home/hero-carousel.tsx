"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import type { Banner } from "@/lib/types";
import { useAutoplayAllowed } from "../hooks";
import { SmartVideo } from "../media/smart-video";

const SLIDE_MS = 9000;

/** Full-width hero of autoplaying, muted property videos (admin-uploaded banners). */
export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const motionOk = useAutoplayAllowed();
  const count = banners.length;
  const current = banners[index % Math.max(count, 1)];

  useEffect(() => {
    if (count < 2 || paused || hovering || !motionOk) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, count, paused, hovering, motionOk]);

  const go = (d: number) => setIndex((i) => (i + d + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured stays"
      className="relative h-[440px] w-full overflow-hidden bg-ink sm:h-[500px] lg:h-[560px]"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
    >
      {count === 0 ? (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--brand)_0%,transparent_55%),linear-gradient(135deg,#1c2230,#2d3548)]" />
      ) : (
        banners.map((b, i) => (
          <div
            key={b.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}: ${b.title}`}
            aria-hidden={i !== index}
            className={cn("absolute inset-0 transition-opacity duration-700", i === index ? "opacity-100" : "pointer-events-none opacity-0")}
          >
            <SmartVideo
              src={b.videoUrl}
              hlsUrl={b.hlsUrl}
              poster={b.posterUrl}
              alt={b.title}
              trigger="controlled"
              active={i === index && !paused}
              eagerPoster={i === 0}
              sizes="100vw"
              className="absolute inset-0"
              onPlayStart={() => track("video_played", { bannerId: b.id, source: "hero" })}
            />
          </div>
        ))
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent" />

      <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-4 pb-24 sm:px-6 lg:px-8 lg:pb-28">
        <p className="text-sm font-medium tracking-wide text-white/80 uppercase">See it before you book it</p>
        <h1 className="mt-2 max-w-2xl text-4xl leading-tight font-bold text-white sm:text-5xl lg:text-6xl">
          Your perfect stay.
          <br />
          <span className="text-accent">Simply Booked.</span>
        </h1>
        {current && (
          <div className="mt-4 max-w-xl" aria-live="polite">
            <p className="text-lg font-semibold text-white">{current.title}</p>
            {current.subtitle && <p className="mt-1 text-sm text-white/80 sm:text-base">{current.subtitle}</p>}
            {(current.ctaUrl || current.propertySlug) && (
              <Link
                href={current.ctaUrl ?? `/stays/${current.propertySlug}`}
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-white px-5 text-sm font-semibold text-ink hover:bg-white/90"
              >
                {current.ctaLabel ?? "View stay"}
              </Link>
            )}
          </div>
        )}
      </div>

      {count > 0 && (
        <div className="absolute right-4 bottom-24 flex items-center gap-2 sm:right-6 lg:right-8 lg:bottom-28">
          {count > 1 && (
            <>
          <button type="button" aria-label="Previous slide" onClick={() => go(-1)} className="flex size-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/35">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose slide">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80")}
              />
            ))}
          </div>
          <button type="button" aria-label="Next slide" onClick={() => go(1)} className="flex size-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/35">
            <ChevronRight className="size-5" aria-hidden />
          </button>
            </>
          )}
          <button
            type="button"
            aria-label={paused ? "Play videos" : "Pause videos"}
            onClick={() => setPaused((p) => !p)}
            className="flex size-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/35"
          >
            {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
          </button>
        </div>
      )}
    </section>
  );
}
