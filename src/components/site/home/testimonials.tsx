"use client";

import { Quote, Star } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Testimonial } from "@/lib/types";
import { SmartImage } from "../media/smart-image";
import { Container } from "../primitives";
import { ScrollRow } from "../scroll-row";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function StarRow({ rating, className }: { rating: number; className?: string }) {
  const r = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`${r} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn("size-4", i < r ? "fill-rating text-rating" : "fill-line text-line")} aria-hidden />
      ))}
    </div>
  );
}

function Avatar({ t }: { t: Testimonial }) {
  if (t.avatarUrl) {
    return (
      <span className="relative size-11 shrink-0 overflow-hidden rounded-full ring-2 ring-brand-soft">
        <SmartImage src={t.avatarUrl} alt={t.authorName} fill sizes="44px" className="object-cover" />
      </span>
    );
  }
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand ring-2 ring-white">
      {initials(t.authorName) || "★"}
    </span>
  );
}

function TestimonialCard({ t, className }: { t: Testimonial; className?: string }) {
  const meta = [t.authorTitle, t.authorLocation].filter(Boolean).join(" · ");
  return (
    <figure
      className={cn(
        "relative flex snap-start flex-col rounded-3xl bg-white p-6 shadow-[0_10px_40px_-15px_rgba(15,57,90,0.45)] sm:p-7",
        className,
      )}
    >
      <Quote className="absolute top-5 right-5 size-9 text-brand-soft" aria-hidden />
      <StarRow rating={t.rating} />
      <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-ink-2">
        <p className="line-clamp-6">“{t.quote}”</p>
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
        <Avatar t={t} />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{t.authorName}</span>
          {meta && <span className="block truncate text-xs text-muted">{meta}</span>}
          {t.propertySlug && t.propertyName && (
            <Link href={`/stays/${t.propertySlug}`} className="block truncate text-xs font-medium text-brand hover:underline">
              Stayed at {t.propertyName}
            </Link>
          )}
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * Homepage "Loved by our guests" section — a premium, brand-dark testimonial carousel.
 * Renders nothing when there are no active testimonials so the slot collapses cleanly.
 */
export function Testimonials({ title, subtitle, items }: { title?: string; subtitle?: string | null; items: Testimonial[] }) {
  if (!items.length) return null;
  const avg = items.reduce((s, t) => s + t.rating, 0) / items.length;

  return (
    <section className="relative overflow-hidden bg-brand-ink py-14 text-white sm:py-16">
      {/* Soft decorative glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-brand/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-rating/20 blur-3xl" aria-hidden />
      <Container className="relative">
        <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">Guest stories</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl lg:text-4xl">{title || "Loved by our guests"}</h2>
          <p className="mt-3 text-sm text-white/75 sm:text-base">
            {subtitle || "Real stays, real stories — from travellers who booked their perfect stay with us."}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
            <StarRow rating={avg} />
            <span className="font-semibold">{avg.toFixed(1)}/5</span>
            <span className="text-white/70">from our guests</span>
          </div>
        </div>
        <ScrollRow label="Guest testimonials">
          {items.map((t) => (
            <TestimonialCard key={t.id} t={t} className="w-[85%] shrink-0 sm:w-[55%] lg:w-[calc((100%-3rem)/3)]" />
          ))}
        </ScrollRow>
      </Container>
    </section>
  );
}
