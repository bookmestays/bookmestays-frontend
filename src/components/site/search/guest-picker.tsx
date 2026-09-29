"use client";

import { Minus, Plus, Users } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { guestsLabel } from "@/lib/search-params";

export type Guests = { adults: number; children: number; rooms: number };

export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div id={id}>
        <p className="text-sm font-medium text-ink">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <div className="flex items-center gap-3" role="group" aria-labelledby={id}>
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex size-8 items-center justify-center rounded-full border border-line text-ink hover:border-ink disabled:opacity-30"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <span className="w-5 text-center text-sm font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex size-8 items-center justify-center rounded-full border border-line text-ink hover:border-ink disabled:opacity-30"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Small popover wrapper that closes on outside click / Escape. */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

export function GuestPicker({
  value,
  onChange,
  showRooms = true,
  className,
  buttonClassName,
  label = "Guests",
  align = "right",
}: {
  value: Guests;
  onChange: (g: Guests) => void;
  showRooms?: boolean;
  className?: string;
  buttonClassName?: string;
  label?: string;
  align?: "left" | "right";
}) {
  const { open, setOpen, ref } = usePopover();
  const panelId = useId();
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={cn("flex w-full flex-col items-start text-left", buttonClassName)}
      >
        <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</span>
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <Users className="size-4 text-muted" aria-hidden />
          {guestsLabel(value.adults, value.children, showRooms ? value.rooms : undefined)}
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          className={cn(
            "absolute top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-white p-4 shadow-xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="divide-y divide-line">
            <Stepper label="Adults" hint="Age 13+" value={value.adults} min={1} max={30} onChange={(adults) => onChange({ ...value, adults, rooms: Math.min(value.rooms, adults) })} />
            <Stepper label="Children" hint="Age 0–12" value={value.children} min={0} max={20} onChange={(children) => onChange({ ...value, children })} />
            {showRooms && (
              <Stepper label="Rooms" value={value.rooms} min={1} max={Math.min(10, value.adults)} onChange={(rooms) => onChange({ ...value, rooms })} />
            )}
          </div>
          <button type="button" onClick={() => setOpen(false)} className="mt-3 h-9 w-full rounded-lg bg-ink text-sm font-medium text-white hover:bg-ink/90">
            Done
          </button>
        </div>
      )}
    </div>
  );
}
