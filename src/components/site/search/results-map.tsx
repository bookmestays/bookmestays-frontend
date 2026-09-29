"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { PropertyCard } from "@/lib/types";
import { SmartImage } from "../media/smart-image";
import { PriceTag, RatingBadge } from "../primitives";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

function mapSrc(points: PropertyCard[], selected: PropertyCard | null) {
  const focus = selected ?? null;
  if (GOOGLE_KEY) {
    if (focus) return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_KEY}&q=${focus.lat},${focus.lng}&zoom=15`;
    const lat = points.reduce((s, p) => s + p.lat!, 0) / points.length;
    const lng = points.reduce((s, p) => s + p.lng!, 0) / points.length;
    return `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_KEY}&center=${lat},${lng}&zoom=11`;
  }
  if (focus) {
    const d = 0.01;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${focus.lng! - d},${focus.lat! - d},${focus.lng! + d},${focus.lat! + d}&layer=mapnik&marker=${focus.lat},${focus.lng}`;
  }
  const lats = points.map((p) => p.lat!);
  const lngs = points.map((p) => p.lng!);
  const pad = 0.02;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(...lngs) - pad},${Math.min(...lats) - pad},${Math.max(...lngs) + pad},${Math.max(...lats) + pad}&layer=mapnik`;
}

/** Simple map view: embedded map + compact list; choosing a stay centres the map on it. */
export function ResultsMap({ items, query }: { items: PropertyCard[]; query: string }) {
  const points = items.filter((p) => p.lat != null && p.lng != null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = points.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <ul className="order-2 flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1 lg:order-1">
        {items.map((p) => {
          const hasPoint = p.lat != null && p.lng != null;
          return (
            <li key={p.id}>
              <div className={cn("flex gap-3 rounded-xl border bg-white p-2.5", selectedId === p.id ? "border-brand ring-2 ring-brand/20" : "border-line")}>
                <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  <SmartImage src={p.coverImageUrl} alt={p.name} fill sizes="80px" className="object-cover" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link href={`/stays/${p.slug}${query}`} className="truncate text-sm font-semibold text-ink hover:underline">
                    {p.name}
                  </Link>
                  <span className="truncate text-xs text-muted">{[p.areaName, p.cityName].filter(Boolean).join(", ")}</span>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <PriceTag paise={p.price} prefix="" />
                    <RatingBadge value={p.ratingAvg} />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!hasPoint}
                  onClick={() => setSelectedId(p.id)}
                  aria-label={hasPoint ? `Show ${p.name} on map` : `${p.name} has no map location`}
                  className="self-center rounded-lg p-2 text-brand hover:bg-brand-soft disabled:text-muted disabled:hover:bg-transparent"
                >
                  <MapPin className="size-5" aria-hidden />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="order-1 h-[45vh] overflow-hidden rounded-xl border border-line bg-surface-2 lg:sticky lg:top-4 lg:order-2 lg:h-[70vh]">
        {points.length > 0 ? (
          <iframe key={selectedId ?? "all"} title="Map of search results" src={mapSrc(points, selected)} className="h-full w-full" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">Map locations aren&apos;t available for these stays yet.</div>
        )}
      </div>
    </div>
  );
}
