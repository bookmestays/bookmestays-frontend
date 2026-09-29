"use client";

import { Building2, Hotel, MapPin, Search } from "lucide-react";
import { useEffect, useId, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { CityLite, PropertyType } from "@/lib/types";

export type Suggestion =
  | { kind: "city"; id: string; label: string; sub?: string; city: string }
  | { kind: "area"; id: string; label: string; sub?: string; city: string; area: string }
  | { kind: "property"; id: string; label: string; sub?: string; slug: string }
  | { kind: "query"; id: string; label: string; q: string };

type SuggestResponse = {
  cities: CityLite[];
  areas: { id: string; name: string; slug: string; citySlug: string; cityName: string }[];
  properties: { id: string; name: string; slug: string; cityName: string | null; type: PropertyType }[];
};

/** Debounced /public/suggest lookup. With < 2 chars it returns `fallbackCities` as city suggestions. */
export function useSuggest(query: string, fallbackCities: CityLite[]) {
  const q = query.trim();
  const [res, setRes] = useState<{ q: string; items: Suggestion[] } | null>(null);

  useEffect(() => {
    if (q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api<SuggestResponse>("/public/suggest", { query: { q } })
        .then((r) => {
          if (cancelled) return;
          const items: Suggestion[] = [
            ...(r.cities ?? []).slice(0, 4).map((c): Suggestion => ({ kind: "city", id: `c-${c.id}`, label: c.name, sub: c.state ?? "City", city: c.slug })),
            ...(r.areas ?? []).slice(0, 4).map((a): Suggestion => ({ kind: "area", id: `a-${a.id}`, label: a.name, sub: a.cityName, city: a.citySlug, area: a.slug })),
            ...(r.properties ?? []).slice(0, 5).map((p): Suggestion => ({ kind: "property", id: `p-${p.id}`, label: p.name, sub: p.cityName ?? undefined, slug: p.slug })),
          ];
          setRes({ q, items });
        })
        .catch(() => !cancelled && setRes({ q, items: [] }));
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  if (q.length < 2) {
    return {
      loading: false,
      items: fallbackCities.slice(0, 8).map((c): Suggestion => ({ kind: "city", id: `c-${c.id}`, label: c.name, sub: c.state ?? "City", city: c.slug })),
      heading: "Popular destinations",
    };
  }
  const items = res?.q === q ? res.items : [];
  return {
    loading: res?.q !== q,
    items: [...items, { kind: "query", id: "q", label: `Search for “${q}”`, q } as Suggestion],
    heading: null,
  };
}

const ICONS: Record<Suggestion["kind"], ReactNode> = {
  city: <Building2 className="size-4" aria-hidden />,
  area: <MapPin className="size-4" aria-hidden />,
  property: <Hotel className="size-4" aria-hidden />,
  query: <Search className="size-4" aria-hidden />,
};

/**
 * Accessible combobox wiring: returns props for the input and the listbox.
 */
export function useCombobox(items: Suggestion[], onSelect: (s: Suggestion) => void, onEnterFree: () => void) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const activeIdx = active >= items.length ? -1 : active;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % Math.max(items.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && activeIdx >= 0 && items[activeIdx]) onSelect(items[activeIdx]);
      else onEnterFree();
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return {
    open,
    setOpen,
    active: activeIdx,
    setActive,
    inputProps: {
      role: "combobox" as const,
      "aria-expanded": open,
      "aria-controls": listId,
      "aria-autocomplete": "list" as const,
      "aria-activedescendant": open && activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined,
      onKeyDown,
      onFocus: () => setOpen(true),
      onBlur: () => setTimeout(() => setOpen(false), 150),
    },
    listId,
  };
}

export function SuggestList({
  id,
  items,
  active,
  heading,
  loading,
  onSelect,
  onHover,
  className,
}: {
  id: string;
  items: Suggestion[];
  active: number;
  heading: string | null;
  loading: boolean;
  onSelect: (s: Suggestion) => void;
  onHover: (i: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-xl", className)}>
      {heading && <p className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">{heading}</p>}
      <ul id={id} role="listbox" className="max-h-80 overflow-y-auto py-1">
        {items.length === 0 && !loading && <li className="px-4 py-3 text-sm text-muted">No suggestions</li>}
        {items.map((s, i) => (
          <li
            key={s.id}
            id={`${id}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(s)}
            onMouseEnter={() => onHover(i)}
            className={cn("flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm", i === active ? "bg-surface-2" : "hover:bg-surface-2")}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">{ICONS[s.kind]}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-ink">{s.label}</span>
              {"sub" in s && s.sub && <span className="block truncate text-xs text-muted">{s.sub}</span>}
            </span>
            <span className="text-[11px] text-muted capitalize">{s.kind === "query" ? "" : s.kind}</span>
          </li>
        ))}
        {loading && <li className="px-4 py-2 text-xs text-muted">Searching…</li>}
      </ul>
    </div>
  );
}

// ─── Remembered city (header city selector) ───────────────────────────────────
const CITY_KEY = "bms_city";
const CITY_EVENT = "bms-city-change";
export type StoredCity = { slug: string; name: string };

function readCity(): string | null {
  try {
    return localStorage.getItem(CITY_KEY);
  } catch {
    return null;
  }
}
export function setStoredCity(c: StoredCity) {
  try {
    localStorage.setItem(CITY_KEY, JSON.stringify(c));
    window.dispatchEvent(new Event(CITY_EVENT));
  } catch {
    // ignore
  }
}
export function useStoredCity(): StoredCity | null {
  const raw = useSyncExternalStore(
    (cb) => {
      window.addEventListener(CITY_EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(CITY_EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    readCity,
    () => null,
  );
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredCity;
  } catch {
    return null;
  }
}
