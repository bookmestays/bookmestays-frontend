import { MapPin } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Lightweight, self-contained location map.
 *
 * Always rendered as an inline OpenStreetMap embed so guests see *where* a
 * property is without being handed off to Google Maps (which surfaces the
 * business listing, phone number and reviews, letting people book around us).
 * The embed shows only a pin at the property's coordinates.
 */
export function MapEmbed({
  lat,
  lng,
  label,
  zoom = 14,
  className,
}: {
  lat: number | null | undefined;
  lng: number | null | undefined;
  label: string;
  zoom?: number;
  className?: string;
}) {
  if (lat == null || lng == null) {
    return (
      <div className={cn("flex items-center justify-center gap-2 rounded-xl bg-surface-2 text-sm text-muted", className)}>
        <MapPin className="size-4" aria-hidden /> Map location coming soon
      </div>
    );
  }
  const d = 0.012 * (15 / zoom);
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div className={cn("overflow-hidden rounded-xl border border-line bg-surface-2", className)}>
      <iframe title={`Map showing ${label}`} src={src} className="h-full w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
    </div>
  );
}

export const directionsUrl = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
