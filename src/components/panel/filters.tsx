"use client";

import { useRef, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input, Select } from "@/components/ui";
import { useUrlParams } from "./url-state";

export function FiltersBar({ children, className }: { children: ReactNode; className?: string }) {
  const { params, set } = useUrlParams();
  const active = [...params.keys()].some((k) => k !== "page" && k !== "tab");
  return (
    <div role="search" className={cn("mb-4 flex flex-wrap items-end gap-2", className)}>
      {children}
      {active && (
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm text-muted hover:bg-white hover:text-ink"
          onClick={() => {
            const patch: Record<string, null> = {};
            for (const k of params.keys()) if (k !== "tab") patch[k] = null;
            set(patch);
          }}
        >
          <X className="size-4" /> Clear
        </button>
      )}
    </div>
  );
}

/** Debounced search box bound to a URL param (default `q`). */
export function SearchFilter({ param = "q", placeholder = "Search…", className }: { param?: string; placeholder?: string; className?: string }) {
  const { get, set } = useUrlParams();
  const urlValue = get(param);
  const [value, setValue] = useState(urlValue);
  const [synced, setSynced] = useState(urlValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // URL changed from elsewhere (e.g. "Clear") → reflect it
  if (urlValue !== synced) {
    setSynced(urlValue);
    setValue(urlValue);
  }
  return (
    <div className={cn("relative w-full sm:w-64", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <Input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        className="pl-9"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            setSynced(v.trim());
            set({ [param]: v.trim() });
          }, 350);
        }}
      />
    </div>
  );
}

export function SelectFilter({
  param,
  label,
  options,
  allLabel = "All",
  className,
}: {
  param: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel?: string;
  className?: string;
}) {
  const { get, set } = useUrlParams();
  return (
    <label className={cn("flex w-full flex-col gap-1 sm:w-auto", className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      <Select value={get(param)} onChange={(e) => set({ [param]: e.target.value })} className="sm:min-w-40">
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

export function DateFilter({ fromParam = "from", toParam = "to", label = "Dates" }: { fromParam?: string; toParam?: string; label?: string }) {
  const { get, set } = useUrlParams();
  return (
    <fieldset className="flex w-full flex-col gap-1 sm:w-auto">
      <legend className="mb-1 text-xs font-medium text-muted">{label}</legend>
      <div className="flex items-center gap-1">
        <Input type="date" aria-label={`${label} from`} value={get(fromParam)} onChange={(e) => set({ [fromParam]: e.target.value })} className="sm:w-40" />
        <span className="text-muted">–</span>
        <Input type="date" aria-label={`${label} to`} value={get(toParam)} min={get(fromParam) || undefined} onChange={(e) => set({ [toParam]: e.target.value })} className="sm:w-40" />
      </div>
    </fieldset>
  );
}

/** Underline tabs bound to a URL param (e.g. booking tabs). */
export function UrlTabs({ param = "tab", tabs, className }: { param?: string; tabs: { value: string; label: string }[]; className?: string }) {
  const { get, set } = useUrlParams();
  const current = get(param) || tabs[0]?.value;
  return (
    <div className={cn("mb-4 -mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0", className)}>
      <div role="tablist" className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={current === t.value}
            onClick={() => set({ [param]: t.value === tabs[0]?.value ? null : t.value })}
            className={cn(
              "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-brand",
              current === t.value ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
