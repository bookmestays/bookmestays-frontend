import Link from "next/link";
import { cn } from "@/lib/cn";
import { TYPE_SLUGS } from "@/lib/search-params";
import type { CityCard as CityCardDTO, CollectionCard as CollectionCardDTO, PropertyType } from "@/lib/types";
import { SmartImage } from "../media/smart-image";

export function CityTile({ c, className }: { c: CityCardDTO; className?: string }) {
  return (
    <Link href={`/cities/${c.slug}`} className={cn("group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-2xl", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2">
        <SmartImage src={c.coverImageUrl} alt={`${c.name} city`} fill sizes="(max-width: 640px) 40vw, 200px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <p className="text-base font-semibold">{c.name}</p>
          <p className="text-xs text-white/80">
            {c.propertyCount} {c.propertyCount === 1 ? "stay" : "stays"}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function CollectionTile({ c, className }: { c: CollectionCardDTO; className?: string }) {
  return (
    <Link href={`/collections/${c.slug}`} className={cn("group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand", className)}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-surface-2">
        <SmartImage src={c.coverImageUrl} alt={c.title} fill sizes="(max-width: 640px) 82vw, 320px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="text-lg leading-tight font-semibold">{c.title}</p>
          <p className="mt-0.5 text-xs text-white/80">{c.propertyCount} handpicked stays</p>
        </div>
      </div>
      {c.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{c.description}</p>}
    </Link>
  );
}

export function PropertyTypeTile({
  item,
  className,
}: {
  item: { type: PropertyType; label: string; count: number; imageUrl: string | null };
  className?: string;
}) {
  return (
    <Link href={`/${TYPE_SLUGS[item.type]}`} className={cn("group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2">
        <SmartImage src={item.imageUrl} alt={item.label} fill sizes="(max-width: 640px) 46vw, 240px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="text-lg font-bold">{item.label}</p>
          <p className="text-xs text-white/85">{item.count > 0 ? `${item.count} stays` : "Explore"}</p>
        </div>
      </div>
    </Link>
  );
}
