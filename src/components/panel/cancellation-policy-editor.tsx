"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import type { CancellationPolicy } from "@/lib/types";

export const EMPTY_POLICY: CancellationPolicy = { summary: "", rules: [] };

export const POLICY_PRESETS: { label: string; policy: CancellationPolicy }[] = [
  {
    label: "Flexible",
    policy: {
      summary: "Free cancellation up to 24 hours before check-in. No refund after that.",
      rules: [
        { hoursBeforeCheckIn: 24, refundPercent: 100 },
        { hoursBeforeCheckIn: 0, refundPercent: 0 },
      ],
    },
  },
  {
    label: "Moderate",
    policy: {
      summary: "Full refund up to 72 hours before check-in, 50% refund up to 24 hours before check-in.",
      rules: [
        { hoursBeforeCheckIn: 72, refundPercent: 100 },
        { hoursBeforeCheckIn: 24, refundPercent: 50 },
        { hoursBeforeCheckIn: 0, refundPercent: 0 },
      ],
    },
  },
  {
    label: "Strict",
    policy: {
      summary: "50% refund up to 7 days before check-in. No refund after that.",
      rules: [
        { hoursBeforeCheckIn: 168, refundPercent: 50 },
        { hoursBeforeCheckIn: 0, refundPercent: 0 },
      ],
    },
  },
  { label: "Non-refundable", policy: { summary: "Non-refundable. No refund on cancellation or no-show.", rules: [{ hoursBeforeCheckIn: 0, refundPercent: 0 }] } },
];

export function validatePolicy(p: CancellationPolicy | null | undefined): string | null {
  if (!p) return null;
  if (!p.summary.trim()) return "Add a short summary guests will read";
  for (const r of p.rules) {
    if (!Number.isFinite(r.hoursBeforeCheckIn) || r.hoursBeforeCheckIn < 0) return "Hours before check-in must be 0 or more";
    if (!Number.isFinite(r.refundPercent) || r.refundPercent < 0 || r.refundPercent > 100) return "Refund % must be between 0 and 100";
  }
  const hours = p.rules.map((r) => r.hoursBeforeCheckIn);
  if (new Set(hours).size !== hours.length) return "Each rule needs a different number of hours";
  return null;
}

/** Summary + "cancel ≥ N hours before check-in → X% refund" rule rows. Rules are kept sorted (most hours first) on blur. */
export function CancellationPolicyEditor({ value, onChange, idPrefix = "cp" }: { value: CancellationPolicy | null; onChange: (p: CancellationPolicy) => void; idPrefix?: string }) {
  const p = value ?? EMPTY_POLICY;
  const error = value ? validatePolicy(value) : null;
  const setRule = (i: number, patch: Partial<CancellationPolicy["rules"][number]>) => onChange({ ...p, rules: p.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const sort = () => onChange({ ...p, rules: [...p.rules].sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Start from a preset:</span>
        {POLICY_PRESETS.map((pr) => (
          <button
            key={pr.label}
            type="button"
            onClick={() => onChange(structuredClone(pr.policy))}
            className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink hover:border-brand hover:text-brand"
          >
            {pr.label}
          </button>
        ))}
      </div>
      <Field label="Summary shown to guests" required>
        <Textarea id={`${idPrefix}-summary`} rows={2} value={p.summary} onChange={(e) => onChange({ ...p, summary: e.target.value })} placeholder="Free cancellation up to 48 hours before check-in…" />
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Refund rules</legend>
        {p.rules.length === 0 && <p className="mb-2 text-sm text-muted">No rules — cancellations will not be refunded.</p>}
        <ul className="space-y-2">
          {p.rules.map((r, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-2 text-sm">
              <span className="text-ink-2">Cancelled</span>
              <Input
                type="number"
                min={0}
                aria-label={`Rule ${i + 1}: hours before check-in`}
                className="h-9 w-20 tabular-nums"
                value={Number.isFinite(r.hoursBeforeCheckIn) ? r.hoursBeforeCheckIn : ""}
                onChange={(e) => setRule(i, { hoursBeforeCheckIn: e.target.value === "" ? NaN : Number(e.target.value) })}
                onBlur={sort}
              />
              <span className="text-ink-2">hours or more before check-in →</span>
              <Input
                type="number"
                min={0}
                max={100}
                aria-label={`Rule ${i + 1}: refund percent`}
                className="h-9 w-20 tabular-nums"
                value={Number.isFinite(r.refundPercent) ? r.refundPercent : ""}
                onChange={(e) => setRule(i, { refundPercent: e.target.value === "" ? NaN : Number(e.target.value) })}
              />
              <span className="text-ink-2">% refund</span>
              <button
                type="button"
                onClick={() => onChange({ ...p, rules: p.rules.filter((_, j) => j !== i) })}
                className="ml-auto rounded-md p-1.5 text-muted hover:bg-white hover:text-danger"
                aria-label={`Remove rule ${i + 1}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => {
            const minH = p.rules.length ? Math.min(...p.rules.map((r) => r.hoursBeforeCheckIn || 0)) : 48;
            onChange({ ...p, rules: [...p.rules, { hoursBeforeCheckIn: p.rules.length ? Math.max(0, Math.floor(minH / 2)) : 48, refundPercent: p.rules.length ? 0 : 100 }] });
          }}
        >
          <Plus className="size-4" /> Add rule
        </Button>
      </fieldset>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function PolicySummary({ policy }: { policy: CancellationPolicy | null | undefined }) {
  if (!policy) return <p className="text-sm text-muted">No policy set</p>;
  return (
    <div className="space-y-1 text-sm">
      <p className="text-ink">{policy.summary}</p>
      {policy.rules.length > 0 && (
        <ul className="list-inside list-disc text-xs text-muted">
          {[...policy.rules]
            .sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn)
            .map((r, i) => (
              <li key={i}>
                ≥ {r.hoursBeforeCheckIn}h before check-in: {r.refundPercent}% refund
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
