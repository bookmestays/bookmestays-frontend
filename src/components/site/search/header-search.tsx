"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { searchHref } from "@/lib/search-params";
import type { CityLite } from "@/lib/types";
import { SuggestList, useCombobox, useSuggest, type Suggestion } from "./suggest";

/** Header search with autosuggest (city / area / property / landmark). */
export function HeaderSearch({
  cities,
  className,
  autoFocus,
  onDone,
}: {
  cities: CityLite[];
  className?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const { items, loading, heading } = useSuggest(value, cities);

  const go = (href: string) => {
    router.push(href);
    setValue("");
    onDone?.();
  };

  const select = (s: Suggestion) => {
    if (s.kind === "property") return go(`/stays/${s.slug}`);
    if (s.kind === "query") {
      track("search_performed", { q: s.q, source: "header" });
      return go(searchHref({ q: s.q }));
    }
    track("destination_selected", { kind: s.kind, city: s.city, area: s.kind === "area" ? s.area : undefined, source: "header" });
    go(searchHref({ city: s.city, area: s.kind === "area" ? s.area : undefined }));
  };

  const submitFree = () => {
    const q = value.trim();
    if (!q) return;
    track("search_performed", { q, source: "header" });
    go(searchHref({ q }));
  };

  const cb = useCombobox(items, select, submitFree);

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submitFree();
      }}
    >
      <label htmlFor="header-search" className="sr-only">
        Search for a city, area, property or landmark
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        id="header-search"
        type="search"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="Search for a city, area, property or landmark"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          cb.setOpen(true);
          cb.setActive(-1);
        }}
        className="h-10 w-full rounded-lg border border-line bg-white pr-9 pl-9 text-sm text-ink placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        {...cb.inputProps}
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => setValue("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink">
          <X className="size-4" aria-hidden />
        </button>
      )}
      {cb.open && (items.length > 0 || loading) && (
        <SuggestList id={cb.listId} items={items} active={cb.active} heading={heading} loading={loading} onSelect={select} onHover={cb.setActive} />
      )}
    </form>
  );
}
