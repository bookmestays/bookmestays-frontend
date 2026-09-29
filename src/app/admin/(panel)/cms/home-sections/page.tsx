"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import type { AdminHomeSection } from "@/lib/panel-types";
import type { HomeSectionType } from "@/lib/types";
import { Badge, Button, Card, ErrorState, Field, Input, Select, Skeleton, useToast } from "@/components/ui";
import { PageHeader, SaveBar } from "@/components/panel/page";
import { NumberInput, Toggle } from "@/components/panel/inputs";
import { sameJson, useUnsavedChanges } from "@/components/panel/unsaved";
import { asList, nullIfEmpty, useSiteMeta } from "@/components/panel/util";
import { cn } from "@/lib/cn";
import { PropertyPicker } from "../../../_components/property-picker";

const TYPE_INFO: Record<HomeSectionType, { label: string; hint: string }> = {
  RECOMMENDED: { label: "Recommended stays", hint: "Properties flagged “Recommended”, or pick specific ones below." },
  FEATURED: { label: "Featured stays", hint: "Properties flagged “Featured”, or pick specific ones below." },
  PROPERTY_TYPES: { label: "Property types", hint: "Hotels / villas / farmhouses… tiles with counts." },
  VIDEO_DISCOVERY: { label: "Video discovery", hint: "Short property videos feed." },
  EXPERIENCES: { label: "Experiences", hint: "Active experiences." },
  CITIES: { label: "Cities", hint: "Featured cities." },
  COLLECTIONS: { label: "Collections", hint: "Curated collections." },
  CITY_SPOTLIGHT: { label: "City spotlight", hint: "Stays, areas and experiences for one city." },
  WHY_BOOKMESTAYS: { label: "Why BookMeStays", hint: "Static value propositions." },
};

export default function HomeSectionsPage() {
  const toast = useToast();
  const meta = useSiteMeta();
  const { data, error, loading, refetch } = useApi<AdminHomeSection[] | { sections: AdminHomeSection[] } | { items: AdminHomeSection[] }>("/admin/home-sections");
  const loaded = data ? ("sections" in data && !Array.isArray(data) ? data.sections : asList(data as AdminHomeSection[])).slice().sort((a, b) => a.sort - b.sort) : null;
  const [draft, setDraft] = useState<AdminHomeSection[] | null>(null);
  const [synced, setSynced] = useState<AdminHomeSection[] | null>(null);
  if (loaded && !sameJson(loaded, synced)) {
    setSynced(loaded);
    setDraft(loaded);
  }
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = !!draft && !!synced && !sameJson(draft, synced);
  useUnsavedChanges(dirty);

  const update = (id: string, patch: Partial<AdminHomeSection>) => setDraft((d) => d && d.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const move = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      if (!d) return d;
      const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      const n = [...d];
      [n[i], n[j]] = [n[j], n[i]];
      return n.map((s, k) => ({ ...s, sort: k }));
    });

  if (error && !data) return <ErrorState message={error.message} onRetry={refetch} />;

  return (
    <>
      <PageHeader title="Home sections" description="Order, toggle and configure homepage sections." breadcrumbs={[{ label: "CMS" }, { label: "Home sections" }]} />
      {!draft ? (
        <Skeleton className="h-96" />
      ) : (
        <ol className="space-y-2">
          {draft.map((s, i) => {
            const open = expanded === s.id;
            const pickable = s.type === "FEATURED" || s.type === "RECOMMENDED";
            return (
              <li key={s.id}>
                <Card className={cn(!s.isActive && "opacity-70")}>
                  <div className="flex flex-wrap items-center gap-2 p-3">
                    <div className="flex flex-col">
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-0.5 text-muted hover:bg-surface-2 disabled:opacity-30">
                        <ArrowUp className="size-4" />
                      </button>
                      <button type="button" aria-label="Move down" disabled={i === draft.length - 1} onClick={() => move(i, 1)} className="rounded p-0.5 text-muted hover:bg-surface-2 disabled:opacity-30">
                        <ArrowDown className="size-4" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{s.title}</p>
                      <p className="text-xs text-muted">
                        <Badge className="mr-1">{TYPE_INFO[s.type]?.label ?? s.type}</Badge>
                        {s.subtitle}
                      </p>
                    </div>
                    <div className="w-28">
                      <Toggle label={s.isActive ? "Visible" : "Hidden"} checked={s.isActive} onChange={(v) => update(s.id, { isActive: v })} />
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setExpanded(open ? null : s.id)} aria-expanded={open}>
                      {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />} Edit
                    </Button>
                  </div>
                  {open && (
                    <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2">
                      <p className="text-xs text-muted sm:col-span-2">{TYPE_INFO[s.type]?.hint}</p>
                      <Field label="Title" required>
                        <Input value={s.title} onChange={(e) => update(s.id, { title: e.target.value })} />
                      </Field>
                      <Field label="Subtitle">
                        <Input value={s.subtitle ?? ""} onChange={(e) => update(s.id, { subtitle: nullIfEmpty(e.target.value) === null ? null : e.target.value })} />
                      </Field>
                      {s.type !== "WHY_BOOKMESTAYS" && (
                        <Field label="Max items" hint="Leave empty for default">
                          <NumberInput min={1} max={50} value={(s.config.limit as number | undefined) ?? null} onChange={(v) => update(s.id, { config: { ...s.config, limit: v ?? undefined } })} />
                        </Field>
                      )}
                      {s.type === "CITY_SPOTLIGHT" && (
                        <Field label="Spotlight city" required>
                          <Select
                            value={(s.config.cityId as string | undefined) ?? ""}
                            onChange={(e) => {
                              const c = meta.data?.cities.find((x) => x.id === e.target.value);
                              update(s.id, { config: { ...s.config, cityId: c?.id, citySlug: c?.slug } });
                            }}
                          >
                            <option value="">Select city</option>
                            {meta.data?.cities.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      )}
                      {pickable && (
                        <div className="sm:col-span-2">
                          <PropertyPicker
                            label="Pinned properties (optional — otherwise curation flags & rank are used)"
                            value={(s.config.propertyIds as string[] | undefined) ?? []}
                            onChange={(ids) => update(s.id, { config: { ...s.config, propertyIds: ids.length ? ids : undefined } })}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ol>
      )}
      <SaveBar dirty={dirty}>
        <Button variant="outline" disabled={!dirty} onClick={() => setDraft(synced)}>
          Discard
        </Button>
        <Button
          loading={busy}
          disabled={!dirty || loading}
          onClick={async () => {
            if (!draft) return;
            if (draft.some((s) => !s.title.trim())) return toast.error("Every section needs a title.");
            setBusy(true);
            try {
              await api("/admin/home-sections", {
                method: "PUT",
                body: { sections: draft.map((s, k) => ({ id: s.id, title: s.title.trim(), subtitle: s.subtitle, config: s.config, sort: k, isActive: s.isActive })) },
              });
              toast.success("Homepage updated");
              refetch();
            } catch (e) {
              toast.error(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Publish changes
        </Button>
      </SaveBar>
    </>
  );
}
