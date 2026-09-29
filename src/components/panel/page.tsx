"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Check, ChevronRight, Copy } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, ErrorState, Skeleton } from "@/components/ui";

export type Crumb = { label: string; href?: string };

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-5 space-y-2">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
            {breadcrumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3" aria-hidden />}
                {c.href ? (
                  <Link href={c.href} className="hover:text-ink hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
            {meta}
          </div>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Titled card section used for forms and detail pages. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)} id={id}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
          <div>
            {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}

export function KeyValue({ items, className, cols = 2 }: { items: { label: ReactNode; value: ReactNode }[]; className?: string; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3", cols === 1 ? "grid-cols-1" : cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs text-muted">{it.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-ink">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StatCard({ label, value, hint, icon, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: "default" | "brand" | "warning" }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        {icon && <span className={cn("[&_svg]:size-4", tone === "brand" ? "text-brand" : tone === "warning" ? "text-warning" : "text-muted")}>{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export type TabDef<K extends string> = { key: K; label: ReactNode; hidden?: boolean; badge?: ReactNode };

/** Accessible tab list (roving arrows). Content rendering is up to the caller. */
export function Tabs<K extends string>({ tabs, value, onChange, className }: { tabs: TabDef<K>[]; value: K; onChange: (k: K) => void; className?: string }) {
  const visible = tabs.filter((t) => !t.hidden);
  return (
    <div className={cn("-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0", className)}>
      <div role="tablist" className="flex min-w-max gap-1 border-b border-line">
        {visible.map((t, i) => (
          <button
            key={t.key}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={value === t.key}
            tabIndex={value === t.key ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              const next = visible[(i + (e.key === "ArrowRight" ? 1 : visible.length - 1)) % visible.length];
              onChange(next.key);
              (e.currentTarget.parentElement?.querySelector(`#tab-${next.key}`) as HTMLElement | null)?.focus();
            }}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-brand",
              value === t.key ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.badge}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Sticky bottom save bar for long forms. */
export function SaveBar({ dirty, children, message }: { dirty?: boolean; children: ReactNode; message?: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-3 mt-6 border-t border-line bg-white/95 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className={cn("mr-auto text-sm", dirty ? "text-warning" : "text-muted")}>{message ?? (dirty ? "You have unsaved changes" : "All changes saved")}</p>
        {children}
      </div>
    </div>
  );
}

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={cn("inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-ink hover:bg-surface-2", className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      aria-label={`${label}: ${value}`}
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/** Standard loading / error wrapper for detail pages. */
export function LoadState({ loading, error, onRetry, children, rows = 4 }: { loading: boolean; error: { message: string } | null; onRetry?: () => void; children: ReactNode; rows?: number }) {
  if (error) return <ErrorState message={error.message} onRetry={onRetry} />;
  if (loading)
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  return <>{children}</>;
}

export function Alert({ tone = "info", title, children, className, action }: { tone?: "info" | "warning" | "danger" | "success"; title?: ReactNode; children?: ReactNode; className?: string; action?: ReactNode }) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warning: "border-warning/30 bg-warning/5 text-ink",
    danger: "border-danger/30 bg-danger/5 text-ink",
    success: "border-success/30 bg-success/5 text-ink",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm", tones[tone], className)}>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "text-ink-2")}>{children}</div>}
      </div>
      {action}
    </div>
  );
}
