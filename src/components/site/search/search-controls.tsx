"use client";

import { List, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, use, useState, useTransition, type ReactNode } from "react";
import { Button, Checkbox } from "@/components/ui";
import { cn } from "@/lib/cn";
import { filtersToQuery, SORT_OPTIONS, type SearchFilters, type SortKey } from "@/lib/search-params";
import { PROPERTY_TYPE_LABELS, TRAVEL_TAG_LABELS, type Amenity, type PropertyType, type TravelTag } from "@/lib/types";
import { Drawer } from "../drawer";

type Ctx = {
  filters: SearchFilters; // URL filters (without route presets)
  navigate: (patch: Partial<SearchFilters>, opts?: { keepPage?: boolean }) => void;
  pending: boolean;
  hide: ("type" | "tags")[];
};
const SearchCtx = createContext<Ctx | null>(null);
const useSearchCtx = () => {
  const c = use(SearchCtx);
  if (!c) throw new Error("SearchCtx missing");
  return c;
};

/** Holds URL filter state + a transition so results dim while the server re-renders. */
export function SearchShell({
  filters,
  basePath,
  hide = [],
  children,
}: {
  filters: SearchFilters;
  basePath: string;
  hide?: ("type" | "tags")[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate: Ctx["navigate"] = (patch, opts) => {
    const next = { ...filters, ...patch, page: opts?.keepPage ? (patch.page ?? filters.page) : 1 };
    const q = filtersToQuery(next);
    startTransition(() => router.push(q ? `${basePath}?${q}` : basePath, { scroll: !!opts?.keepPage }));
  };
  return <SearchCtx value={{ filters, navigate, pending, hide }}>{children}</SearchCtx>;
}

export function ResultsPending({ children }: { children: ReactNode }) {
  const { pending } = useSearchCtx();
  return (
    <div aria-busy={pending} className={cn("transition-opacity", pending && "pointer-events-none opacity-50")}>
      {children}
    </div>
  );
}

const PRICE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: "Under ₹3,000", max: 3000 },
  { label: "₹3,000 – ₹6,000", min: 3000, max: 6000 },
  { label: "₹6,000 – ₹10,000", min: 6000, max: 10000 },
  { label: "₹10,000+", min: 10000 },
];
const RATINGS = [4.5, 4, 3.5, 3];

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-line py-4 last:border-0">
      <legend className="mb-2.5 text-sm font-semibold text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function FiltersPanel({ amenities, className }: { amenities: Amenity[]; className?: string }) {
  const { filters: f, navigate, hide } = useSearchCtx();
  const [minP, setMinP] = useState(f.minPrice ? String(f.minPrice) : "");
  const [maxP, setMaxP] = useState(f.maxPrice ? String(f.maxPrice) : "");
  const [showAll, setShowAll] = useState(false);
  const propAmenities = amenities.filter((a) => a.scope !== "ROOM");
  const visibleAmenities = showAll ? propAmenities : propAmenities.slice(0, 8);
  const activeCount =
    f.type.length + f.tags.length + f.amenities.length + (f.minPrice ? 1 : 0) + (f.maxPrice ? 1 : 0) + (f.rating ? 1 : 0);

  const applyPrice = () => {
    const min = Number(minP) || undefined;
    const max = Number(maxP) || undefined;
    if (min !== f.minPrice || max !== f.maxPrice) navigate({ minPrice: min, maxPrice: max });
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-base font-semibold text-ink">Filters</h2>
        {activeCount > 0 && (
          <button
            type="button"
            className="text-sm font-medium text-brand hover:underline"
            onClick={() => {
              setMinP("");
              setMaxP("");
              navigate({ type: [], tags: [], amenities: [], minPrice: undefined, maxPrice: undefined, rating: undefined });
            }}
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <FilterGroup title="Price per night">
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map((p) => {
            const active = f.minPrice === p.min && f.maxPrice === p.max;
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setMinP(active ? "" : p.min ? String(p.min) : "");
                  setMaxP(active ? "" : p.max ? String(p.max) : "");
                  navigate(active ? { minPrice: undefined, maxPrice: undefined } : { minPrice: p.min, maxPrice: p.max });
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  active ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-2 hover:border-ink",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyPrice();
          }}
        >
          <label className="sr-only" htmlFor="minPrice">
            Minimum price (₹)
          </label>
          <input id="minPrice" inputMode="numeric" placeholder="Min ₹" value={minP} onChange={(e) => setMinP(e.target.value.replace(/\D/g, ""))} onBlur={applyPrice} className="h-9 w-full min-w-0 rounded-lg border border-line px-2.5 text-sm focus:border-brand focus:outline-none" />
          <span className="text-muted">–</span>
          <label className="sr-only" htmlFor="maxPrice">
            Maximum price (₹)
          </label>
          <input id="maxPrice" inputMode="numeric" placeholder="Max ₹" value={maxP} onChange={(e) => setMaxP(e.target.value.replace(/\D/g, ""))} onBlur={applyPrice} className="h-9 w-full min-w-0 rounded-lg border border-line px-2.5 text-sm focus:border-brand focus:outline-none" />
          <button type="submit" className="h-9 shrink-0 rounded-lg border border-line px-3 text-sm font-medium hover:bg-surface-2">
            Go
          </button>
        </form>
      </FilterGroup>

      {!hide.includes("type") && (
        <FilterGroup title="Property type">
          <div className="flex flex-col gap-2">
            {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
              <Checkbox key={t} label={PROPERTY_TYPE_LABELS[t]} checked={f.type.includes(t)} onChange={() => navigate({ type: toggle(f.type, t) })} />
            ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Guest rating">
        <div className="flex flex-col gap-2">
          {RATINGS.map((r) => (
            <label key={r} className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input type="radio" name="rating" className="size-4 accent-brand" checked={f.rating === r} onChange={() => navigate({ rating: r })} />
              {r}+ rated
            </label>
          ))}
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input type="radio" name="rating" className="size-4 accent-brand" checked={!f.rating} onChange={() => navigate({ rating: undefined })} />
            Any rating
          </label>
        </div>
      </FilterGroup>

      {!hide.includes("tags") && (
        <FilterGroup title="Travel style">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TRAVEL_TAG_LABELS) as TravelTag[]).map((t) => {
              const active = f.tags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={active}
                  onClick={() => navigate({ tags: toggle(f.tags, t) })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium",
                    active ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-2 hover:border-ink",
                  )}
                >
                  {TRAVEL_TAG_LABELS[t]}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {propAmenities.length > 0 && (
        <FilterGroup title="Amenities">
          <div className="flex flex-col gap-2">
            {visibleAmenities.map((a) => (
              <Checkbox key={a.code} label={a.name} checked={f.amenities.includes(a.code)} onChange={() => navigate({ amenities: toggle(f.amenities, a.code) })} />
            ))}
          </div>
          {propAmenities.length > 8 && (
            <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-2 text-sm font-medium text-brand hover:underline">
              {showAll ? "Show fewer" : `Show all ${propAmenities.length}`}
            </button>
          )}
        </FilterGroup>
      )}
    </div>
  );
}

export function SortSelect({ className }: { className?: string }) {
  const { filters, navigate } = useSearchCtx();
  return (
    <label className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <span className="text-muted">Sort</span>
      <select
        value={filters.sort}
        onChange={(e) => navigate({ sort: e.target.value as SortKey })}
        className="h-9 rounded-lg border border-line bg-white px-2 text-sm font-medium text-ink focus:border-brand focus:outline-none"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ViewToggle() {
  const { filters, navigate } = useSearchCtx();
  return (
    <div role="group" aria-label="Results view" className="inline-flex rounded-lg border border-line bg-white p-0.5">
      {(
        [
          ["list", "List", List],
          ["map", "Map", MapIcon],
        ] as const
      ).map(([v, label, Icon]) => (
        <button
          key={v}
          type="button"
          aria-pressed={filters.view === v}
          onClick={() => navigate({ view: v }, { keepPage: true })}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium",
            filters.view === v ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2",
          )}
        >
          <Icon className="size-4" aria-hidden /> {label}
        </button>
      ))}
    </div>
  );
}

export function MobileFilterButton({ amenities, total }: { amenities: Amenity[]; total: number }) {
  const [open, setOpen] = useState(false);
  const { filters: f } = useSearchCtx();
  const activeCount = f.type.length + f.tags.length + f.amenities.length + (f.minPrice || f.maxPrice ? 1 : 0) + (f.rating ? 1 : 0);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="lg:hidden">
        <SlidersHorizontal className="size-4" aria-hidden />
        Filters{activeCount ? ` (${activeCount})` : ""}
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        side="bottom"
        footer={
          <Button className="w-full" size="lg" onClick={() => setOpen(false)}>
            Show {total} stay{total === 1 ? "" : "s"}
          </Button>
        }
      >
        <FiltersPanel amenities={amenities} className="px-4 pb-4" />
      </Drawer>
    </>
  );
}
