"use client";

import { ArrowRight, Clock, MapPin, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import type { ExperienceCard } from "@/lib/types";
import { formatDuration } from "../constants";
import { SmartImage } from "../media/smart-image";
import { Container } from "../primitives";

const ROTATE_MS = 6000;
const MAX_ITEMS = 6;

/**
 * Immersive home "Experiences" band: the selected experience fills the
 * background, its story sits bottom-left, and a frosted panel lists the others.
 * Auto-rotates until the visitor interacts.
 */
export function ExperienceShowcase({ title, subtitle, items }: { title: string; subtitle: string | null; items: ExperienceCard[] }) {
  const list = items.slice(0, MAX_ITEMS);
  const [active, setActive] = useState(0);
  const [interacted, setInteracted] = useState(false);

  useEffect(() => {
    if (interacted || list.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((i) => (i + 1) % list.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [interacted, list.length]);

  if (!list.length) return null;
  const e = list[active % list.length];
  const duration = formatDuration(e.durationMinutes);
  const select = (i: number) => {
    setInteracted(true);
    setActive(i);
  };

  return (
    <section aria-labelledby="experiences-title" className="relative isolate overflow-hidden bg-ink text-white">
      {/* Background images (cross-fade) */}
      {list.map((x, i) => (
        <div key={x.id} aria-hidden className={cn("absolute inset-0 -z-10 transition-opacity duration-1000", i === active ? "opacity-100" : "opacity-0")}>
          <SmartImage
            src={x.coverImageUrl}
            alt=""
            fill
            sizes="100vw"
            priority={false}
            className={cn("object-cover transition-transform duration-[7000ms] ease-out", i === active ? "scale-105" : "scale-100")}
          />
        </div>
      ))}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/45 to-black/20" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

      <Container className="grid min-h-[600px] gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:items-end lg:gap-12">
        {/* Selected experience */}
        <div className="flex flex-col justify-end lg:pb-2" aria-live="polite">
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase backdrop-blur">
            <Sparkles className="size-3.5 text-accent" aria-hidden /> Experience{e.cityName ? ` · ${e.cityName}` : ""}
          </p>
          <h3 key={e.id} className="mt-3 max-w-xl animate-[fade-up_0.6s_ease-out] font-display text-3xl leading-tight font-bold sm:text-4xl lg:text-5xl">
            {e.title}
          </h3>
          {e.shortDescription && <p className="mt-3 line-clamp-3 max-w-lg text-sm text-white/85 sm:text-base">{e.shortDescription}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/90">
            {duration && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden /> {duration}
              </span>
            )}
            {e.ratingCount > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-4 fill-rating text-rating" aria-hidden /> {e.ratingAvg.toFixed(1)}
                <span className="text-white/70">({e.ratingCount})</span>
              </span>
            )}
            {e.price != null && (
              <span>
                <span className="text-lg font-bold text-white">{formatINR(e.price)}</span>
                <span className="text-white/70"> / person</span>
              </span>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/experiences/${e.slug}`}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-ink shadow-lg transition hover:bg-accent-hover"
            >
              View experience <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/experiences"
              className="inline-flex h-11 items-center rounded-xl border border-white/60 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              All experiences
            </Link>
          </div>
          {list.length > 1 && (
            <div className="mt-6 flex gap-1.5" role="tablist" aria-label="Choose experience">
              {list.map((x, i) => (
                <button
                  key={x.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={x.title}
                  onClick={() => select(i)}
                  className="h-1 w-8 overflow-hidden rounded-full bg-white/30"
                >
                  <span
                    className={cn(
                      "block h-full origin-left rounded-full bg-white",
                      i === active ? (interacted ? "scale-x-100" : "animate-[progress_6s_linear]") : i < active ? "scale-x-100 opacity-60" : "scale-x-0",
                    )}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Frosted list panel */}
        <div className="rounded-3xl border border-white/15 bg-black/40 p-5 shadow-2xl backdrop-blur-md sm:p-7">
          <h2 id="experiences-title" className="font-display text-2xl font-bold sm:text-3xl">
            {title}
          </h2>
          <p className="mt-1.5 text-sm text-white/80">{subtitle ?? "Pair your stay with local food, culture and adventure — hosted by people who know the place."}</p>
          <ul className="mt-5 grid grid-cols-3 gap-1.5 sm:gap-2.5">
            {list.map((x, i) => (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => select(i)}
                  onMouseEnter={() => select(i)}
                  aria-pressed={i === active}
                  className={cn(
                    "group flex w-full flex-col items-center gap-2 rounded-2xl p-1.5 text-center transition sm:p-2.5",
                    i === active ? "bg-white/20 ring-1 ring-accent" : "hover:bg-white/10",
                  )}
                >
                  <span className="relative size-14 overflow-hidden rounded-full ring-2 ring-white/40 transition group-hover:ring-accent">
                    <SmartImage src={x.coverImageUrl} alt="" fill sizes="56px" className="object-cover" />
                  </span>
                  <span className="line-clamp-2 text-[11px] leading-snug font-semibold sm:text-[13px]">{x.title}</span>
                  {x.cityName && (
                    <span className="-mt-1 inline-flex items-center gap-0.5 text-[11px] text-white/70">
                      <MapPin className="size-3" aria-hidden /> {x.cityName}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <Link href="/experiences" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
            Browse all experiences <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Container>
    </section>
  );
}
