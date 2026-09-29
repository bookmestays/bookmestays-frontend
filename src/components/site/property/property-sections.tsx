import { Check, Clock, LogIn, LogOut, MapPin, Navigation, ScrollText } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Amenity, CancellationPolicy, NearbyPlace } from "@/lib/types";
import { SmartImage } from "../media/smart-image";
import { directionsUrl, MapEmbed } from "../map-embed";
import { Prose } from "../primitives";

export function DetailSection({
  id,
  title,
  subtitle,
  children,
  className,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-16 border-t border-line py-8", className)}>
      <h2 id={`${id}-title`} className="text-xl font-bold text-ink">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AmenitiesGrid({ amenities }: { amenities: Amenity[] }) {
  const groups = new Map<string, Amenity[]>();
  for (const a of amenities) {
    const k = a.category || "General";
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[...groups.entries()].map(([cat, list]) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-ink capitalize">{cat.toLowerCase().replace(/_/g, " ")}</h3>
          <ul className="mt-2 space-y-1.5">
            {list.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-sm text-ink-2">
                <Check className="size-4 shrink-0 text-success" aria-hidden /> {a.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function NearbyList({ places }: { places: NearbyPlace[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {places.map((p) => {
        const img = p.media.find((m) => m.kind === "IMAGE");
        return (
          <li key={p.id} className="flex gap-3 rounded-xl border border-line bg-white p-3">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              <SmartImage src={img?.url ?? img?.posterUrl} alt={p.name} fill sizes="80px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-ink">{p.name}</p>
              <p className="text-xs text-muted">
                {p.category}
                {p.distanceKm != null && ` · ${p.distanceKm < 1 ? `${Math.round(p.distanceKm * 1000)} m` : `${p.distanceKm.toFixed(1)} km`} away`}
              </p>
              {p.description && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{p.description}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function LocationBlock({ name, address, lat, lng }: { name: string; address: string | null; lat: number | null; lng: number | null }) {
  return (
    <div className="space-y-3">
      {address && (
        <p className="flex items-start gap-2 text-sm text-ink-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> {address}
        </p>
      )}
      <MapEmbed lat={lat} lng={lng} label={name} className="h-72 sm:h-80" />
      {lat != null && lng != null && (
        <a href={directionsUrl(lat, lng)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
          <Navigation className="size-4" aria-hidden /> Get directions
        </a>
      )}
    </div>
  );
}

export function PolicyRules({ policy }: { policy: CancellationPolicy | null }) {
  if (!policy) return <p className="text-sm text-ink-2">Cancellation terms are shown for each rate before you pay.</p>;
  const rules = [...policy.rules].sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn);
  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-2">{policy.summary}</p>
      {rules.length > 0 && (
        <table className="w-full max-w-md text-left text-sm">
          <caption className="sr-only">Refund by cancellation time</caption>
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th scope="col" className="py-2 font-medium">
                Cancel before check-in
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Refund
              </th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.hoursBeforeCheckIn} className="border-b border-line last:border-0">
                <td className="py-2 text-ink-2">
                  {r.hoursBeforeCheckIn >= 48 ? `${Math.round(r.hoursBeforeCheckIn / 24)} days` : `${r.hoursBeforeCheckIn} hours`} or more
                </td>
                <td className="py-2 text-right font-medium text-ink">{r.refundPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function RulesBlock({
  checkInTime,
  checkOutTime,
  houseRules,
  policy,
  terms,
}: {
  checkInTime: string | null;
  checkOutTime: string | null;
  houseRules: string[];
  policy: CancellationPolicy | null;
  terms: string | null;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-5">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <LogIn className="size-5 text-muted" aria-hidden />
            <div>
              <p className="text-xs text-muted">Check-in</p>
              <p className="font-semibold text-ink">{checkInTime ? `From ${checkInTime}` : "From 2:00 PM"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LogOut className="size-5 text-muted" aria-hidden />
            <div>
              <p className="text-xs text-muted">Check-out</p>
              <p className="font-semibold text-ink">{checkOutTime ? `Until ${checkOutTime}` : "Until 11:00 AM"}</p>
            </div>
          </div>
        </div>
        {houseRules.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ScrollText className="size-4" aria-hidden /> House rules
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
              {houseRules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="space-y-5">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Clock className="size-4" aria-hidden /> Cancellation policy
          </h3>
          <div className="mt-2">
            <PolicyRules policy={policy} />
          </div>
        </div>
        {terms && (
          <details className="rounded-lg border border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold text-ink">Terms &amp; conditions</summary>
            <Prose text={terms} className="mt-2 text-sm sm:text-sm" />
          </details>
        )}
      </div>
    </div>
  );
}
