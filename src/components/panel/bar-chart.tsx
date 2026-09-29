"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";

/**
 * Minimal dependency-free SVG bar chart (daily series). Hover/focus a bar to see its value.
 * `format` renders the primary value; `secondary` adds a second line to the tooltip.
 */
export function BarChart({
  data,
  format,
  secondary,
  label,
  height = 180,
}: {
  data: { date: string; value: number; secondary?: number }[];
  format: (v: number) => string;
  secondary?: (v: number) => string;
  label: string;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  if (!data.length) return <p className="py-10 text-center text-sm text-muted">No data for this period.</p>;

  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 600;
  const H = height;
  const padB = 22;
  const padT = 8;
  const gap = 2;
  const bw = W / data.length - gap;
  const total = data.reduce((s, d) => s + d.value, 0);
  const shown = active !== null ? data[active] : null;

  return (
    <figure className="space-y-2">
      <div className="flex min-h-10 items-end justify-between gap-2 text-sm">
        {shown ? (
          <div>
            <p className="text-xs text-muted">{formatDate(shown.date, { weekday: "short", day: "numeric", month: "short" })}</p>
            <p className="font-semibold text-ink tabular-nums">
              {format(shown.value)}
              {secondary && shown.secondary !== undefined && <span className="ml-2 text-xs font-normal text-muted">{secondary(shown.secondary)}</span>}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted">Total · {data.length} days</p>
            <p className="font-semibold text-ink tabular-nums">{format(total)}</p>
          </div>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label} preserveAspectRatio="none" style={{ maxHeight: H }}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={0} x2={W} y1={padT + (H - padB - padT) * (1 - f)} y2={padT + (H - padB - padT) * (1 - f)} stroke="var(--line)" strokeDasharray="3 3" />
        ))}
        {data.map((d, i) => {
          const h = ((H - padB - padT) * d.value) / max;
          const x = i * (bw + gap);
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={H - padB - h}
                width={bw}
                height={Math.max(h, d.value > 0 ? 1.5 : 0)}
                rx={2}
                fill={active === i ? "var(--brand-hover)" : "var(--brand)"}
                opacity={active === null || active === i ? 1 : 0.55}
              />
              <rect
                x={x}
                y={0}
                width={bw + gap}
                height={H}
                fill="transparent"
                tabIndex={0}
                aria-label={`${d.date}: ${format(d.value)}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none"
              />
              {(i === data.length - 1 || (i % 7 === 0 && data.length - 1 - i >= 4)) && (
                <text
                  x={i === 0 ? x : i === data.length - 1 ? x + bw : x + bw / 2}
                  y={H - 6}
                  textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
                  fontSize={10}
                  fill="var(--muted)"
                >
                  {formatDate(d.date, { day: "numeric", month: "short" })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
