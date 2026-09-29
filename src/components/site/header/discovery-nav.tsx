"use client";

import { Building2, Clapperboard, Compass, Heart, Home, Landmark, Layers, Sparkles, TreePine, Users, Users2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { cn } from "@/lib/cn";

type Item = { href: string; label: string; icon: ComponentType<{ className?: string }> };

const TYPES: Item[] = [
  { href: "/hotels", label: "Hotels", icon: Building2 },
  { href: "/villas", label: "Villas", icon: Home },
  { href: "/farmhouses", label: "Farmhouses", icon: TreePine },
  { href: "/homestays", label: "Homestays", icon: Users },
  { href: "/heritage-stays", label: "Heritage", icon: Landmark },
];
const TRAVEL: Item[] = [
  { href: "/travel/couples", label: "Couples", icon: Heart },
  { href: "/travel/family", label: "Family", icon: Users2 },
  { href: "/travel/friends", label: "Friends", icon: Sparkles },
  { href: "/travel/corporate", label: "Corporate", icon: Compass },
];
const MORE: Item[] = [
  { href: "/experiences", label: "Experiences", icon: Sparkles },
  { href: "/videos", label: "Video tours", icon: Clapperboard },
  { href: "/collections", label: "Collections", icon: Layers },
];

/** Discovery chips: stay types · travel styles · experiences (scrolls sideways on small screens). */
export function DiscoveryNav() {
  const pathname = usePathname();
  const chip = (l: Item) => {
    const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
    const Icon = l.icon;
    return (
      <li key={l.href} className="shrink-0">
        <Link
          href={l.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors",
            active
              ? "border-brand bg-brand text-white"
              : "border-line bg-white text-ink-2 hover:border-brand/40 hover:bg-brand-soft hover:text-brand",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {l.label}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Discover stays" className="border-b border-line bg-surface-2">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="no-scrollbar flex items-center gap-2 overflow-x-auto py-2.5">
          {TYPES.map(chip)}
          <li aria-hidden className="h-5 w-px shrink-0 bg-line" />
          {TRAVEL.map(chip)}
          <li aria-hidden className="h-5 w-px shrink-0 bg-line" />
          {MORE.map(chip)}
        </ul>
      </div>
    </nav>
  );
}
