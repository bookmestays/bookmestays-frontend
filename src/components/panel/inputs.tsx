"use client";

import { useState, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, Input, Select } from "@/components/ui";
import type { CommissionType } from "@/lib/types";

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;

/**
 * Text-backed numeric input that keeps what the user types (e.g. "12.") while emitting parsed numbers.
 * Re-syncs when the external value changes to something the user didn't type.
 */
function useNumericText(external: number | null, toText: (n: number) => string) {
  const [text, setText] = useState(external == null ? "" : toText(external));
  const [last, setLast] = useState<number | null>(external);
  if (external !== last) {
    setLast(external);
    setText(external == null ? "" : toText(external));
  }
  return { text, setText, setLast };
}

const trimNum = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

/** Rupees in the UI ↔ paise in the API. */
export function MoneyInput({ value, onChange, className, ...rest }: BaseProps & { value: number | null | undefined; onChange: (paise: number | null) => void }) {
  const ext = value ?? null;
  const { text, setText, setLast } = useNumericText(ext, (p) => trimNum(p / 100));
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">₹</span>
      <Input
        inputMode="decimal"
        {...rest}
        className="pl-7 tabular-nums"
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.]/g, "");
          if ((t.match(/\./g) ?? []).length > 1) return;
          setText(t);
          const next = t === "" || t === "." ? null : Math.round(Number(t) * 100);
          setLast(next);
          onChange(next);
        }}
      />
    </div>
  );
}

/** Percent in the UI ↔ basis points in the API. */
export function PercentInput({ value, onChange, className, max = 100, ...rest }: BaseProps & { value: number | null | undefined; onChange: (bps: number | null) => void; max?: number }) {
  const ext = value ?? null;
  const { text, setText, setLast } = useNumericText(ext, (b) => trimNum(b / 100));
  return (
    <div className={cn("relative", className)}>
      <Input
        inputMode="decimal"
        {...rest}
        className="pr-8 tabular-nums"
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.]/g, "");
          if ((t.match(/\./g) ?? []).length > 1) return;
          if (t !== "" && Number(t) > max) return;
          setText(t);
          const next = t === "" || t === "." ? null : Math.round(Number(t) * 100);
          setLast(next);
          onChange(next);
        }}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">%</span>
    </div>
  );
}

/** Integer input that emits numbers (or null when empty). */
export function NumberInput({ value, onChange, min, max, className, ...rest }: BaseProps & { value: number | null | undefined; onChange: (n: number | null) => void; min?: number; max?: number }) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      {...rest}
      min={min}
      max={max}
      className={cn("tabular-nums", className)}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    />
  );
}

/** Commission type + value. PERCENT → bps; FLAT → paise per room-night. */
export function CommissionInput({
  type,
  value,
  onChange,
  id,
  invalid,
}: {
  type: CommissionType;
  value: number | null;
  onChange: (next: { type: CommissionType; value: number | null }) => void;
  id?: string;
  invalid?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <Select aria-label="Commission type" value={type} onChange={(e) => onChange({ type: e.target.value as CommissionType, value: null })} className="w-40 shrink-0">
        <option value="PERCENT">Percentage</option>
        <option value="FLAT">Flat / room-night</option>
      </Select>
      {type === "PERCENT" ? (
        <PercentInput id={id} aria-invalid={invalid} aria-label="Commission percent" value={value} onChange={(v) => onChange({ type, value: v })} className="flex-1" placeholder="15" />
      ) : (
        <MoneyInput id={id} aria-invalid={invalid} aria-label="Commission amount per room-night" value={value} onChange={(v) => onChange({ type, value: v })} className="flex-1" placeholder="500" />
      )}
    </div>
  );
}

export function DateRangePicker({
  from,
  to,
  onChange,
  min,
  className,
  labels = ["From", "To"],
}: {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  min?: string;
  className?: string;
  labels?: [string, string];
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">{labels[0]}</span>
        <Input type="date" value={from} min={min} onChange={(e) => onChange({ from: e.target.value, to: to && e.target.value > to ? e.target.value : to })} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">{labels[1]}</span>
        <Input type="date" value={to} min={from || min} onChange={(e) => onChange({ from, to: e.target.value })} />
      </label>
    </div>
  );
}

/** Editable list of short strings (highlights, house rules, inclusions…). */
export function StringListEditor({
  value,
  onChange,
  placeholder = "Add item",
  addLabel = "Add",
  max,
  label,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  max?: number;
  label?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || (max && value.length >= max)) return;
    onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <Input
                aria-label={`${label ?? "Item"} ${i + 1}`}
                value={item}
                onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
                onBlur={(e) => !e.target.value.trim() && onChange(value.filter((_, j) => j !== i))}
              />
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-danger" aria-label={`Remove ${item || "item"}`}>
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {(!max || value.length < max) && (
        <div className="flex gap-2">
          <Input
            aria-label={label ? `New ${label.toLowerCase()}` : placeholder}
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button variant="outline" onClick={add} disabled={!draft.trim()}>
            <Plus className="size-4" /> {addLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Comma/enter separated chips (e.g. SEO keywords). */
export function ChipsInput({ value, onChange, placeholder = "Type and press Enter", ariaLabel }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; ariaLabel?: string }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !value.includes(s));
    if (parts.length) onChange([...value, ...parts]);
    setDraft("");
  };
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
      {value.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink">
          {v}
          <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))} className="text-muted hover:text-danger">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        aria-label={ariaLabel ?? placeholder}
        className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none"
        value={draft}
        placeholder={value.length ? "" : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
      />
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4", disabled && "cursor-not-allowed opacity-60")}>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          checked ? "bg-brand" : "bg-line",
        )}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5.5" : "translate-x-0.5")} />
      </button>
    </label>
  );
}
