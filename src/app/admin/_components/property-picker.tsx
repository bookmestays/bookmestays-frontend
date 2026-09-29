"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useApi } from "@/lib/use-api";
import type { AdminPropertyRow, Paginated } from "@/lib/types";
import { Input } from "@/components/ui";

/** Ordered multi-select of LIVE properties (ids), with search. */
export function PropertyPicker({ value, onChange, max, label = "Properties" }: { value: string[]; onChange: (ids: string[]) => void; max?: number; label?: string }) {
  const [q, setQ] = useState("");
  const all = useApi<Paginated<AdminPropertyRow>>("/admin/properties", { status: "LIVE", limit: 100 });
  const search = useApi<Paginated<AdminPropertyRow>>(q.trim().length >= 2 ? "/admin/properties" : null, { status: "LIVE", q: q.trim(), limit: 20 });
  const [seen, setSeen] = useState<Record<string, AdminPropertyRow>>({});
  const known: Record<string, AdminPropertyRow> = { ...seen };
  for (const p of all.data?.items ?? []) known[p.id] = p;
  const results = (q.trim().length >= 2 ? search.data?.items : all.data?.items)?.filter((p) => !value.includes(p.id)).slice(0, 8) ?? [];
  const full = max !== undefined && value.length >= max;

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const n = [...value];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ink">
        {label} <span className="font-normal text-muted">({value.length}{max ? `/${max}` : ""})</span>
      </p>
      {value.length > 0 && (
        <ol className="divide-y divide-line rounded-lg border border-line">
          {value.map((id, i) => (
            <li key={id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="w-5 text-xs text-muted tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">
                {known[id]?.name ?? <span className="font-mono text-xs text-muted">{id}</span>}
                {known[id]?.cityName && <span className="text-xs text-muted"> · {known[id].cityName}</span>}
              </span>
              <button type="button" aria-label="Move up" className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" aria-label="Move down" className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30" disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown className="size-3.5" />
              </button>
              <button type="button" aria-label="Remove" className="rounded p-1 text-muted hover:bg-surface-2 hover:text-danger" onClick={() => onChange(value.filter((x) => x !== id))}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}
      {!full && (
        <div className="space-y-1">
          <Input type="search" placeholder="Search live properties…" aria-label="Search properties to add" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="max-h-56 overflow-y-auto rounded-lg border border-line">
            {results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted">{all.loading || search.loading ? "Loading…" : "No matching live properties"}</li>
            ) : (
              results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
                    onClick={() => {
                      setSeen((s) => ({ ...s, [p.id]: p }));
                      onChange([...value, p.id]);
                    }}
                  >
                    <Plus className="size-3.5 text-brand" />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-muted">{p.cityName}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
