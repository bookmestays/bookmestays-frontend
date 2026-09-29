"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, EmptyState, ErrorState, Skeleton, Spinner } from "@/components/ui";
import type { Paginated } from "@/lib/types";
import { useUrlParams } from "./url-state";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  /** value used for client-side sorting of the current page; enables the sort toggle */
  sortValue?: (row: T) => string | number | null | undefined;
  className?: string;
  headerClassName?: string;
  align?: "left" | "right" | "center";
  /** hide on small screens */
  hideBelow?: "sm" | "md" | "lg";
};

export type TablePagination = Pagination;
type Pagination = { page: number; totalPages: number; total: number; limit?: number; onPageChange: (page: number) => void };

const hideClass = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" };

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  onRowClick,
  rowHref,
  empty,
  pagination,
  className,
  dense,
  caption,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: { message: string } | null;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  rowHref?: (row: T) => string;
  empty?: { title: string; description?: ReactNode; action?: ReactNode; icon?: ReactNode };
  pagination?: Pagination;
  className?: string;
  dense?: boolean;
  caption?: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const click = onRowClick ?? (rowHref ? (r: T) => router.push(rowHref(r)) : undefined);

  let sorted = rows ?? [];
  if (sort) {
    const col = columns.find((c) => c.key === sort.key);
    if (col?.sortValue) {
      const sv = col.sortValue;
      sorted = [...sorted].sort((a, b) => {
        const x = sv(a);
        const y = sv(b);
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "en-IN", { numeric: true });
        return sort.dir === "asc" ? r : -r;
      });
    }
  }

  if (error && !rows?.length) return <ErrorState message={error.message} onRetry={onRetry} />;

  const initialLoading = loading && !rows;
  const cellPad = dense ? "px-3 py-2" : "px-4 py-3";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="relative overflow-x-auto">
        {loading && rows && (
          <div className="absolute top-2 right-2 z-10 text-muted" aria-live="polite">
            <Spinner className="size-4" />
          </div>
        )}
        <table className="w-full min-w-[640px] border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-surface-2/60">
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "border-b border-line text-left text-xs font-semibold tracking-wide text-muted uppercase whitespace-nowrap",
                      cellPad,
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.hideBelow && hideClass[c.hideBelow],
                      c.headerClassName,
                    )}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        className={cn("inline-flex items-center gap-1 uppercase hover:text-ink", active && "text-ink")}
                        onClick={() => setSort(active ? (sort.dir === "asc" ? { key: c.key, dir: "desc" } : null) : { key: c.key, dir: "asc" })}
                      >
                        {c.header}
                        {active ? sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-50" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {initialLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className={cn(cellPad, c.hideBelow && hideClass[c.hideBelow])}>
                      <Skeleton className="h-4 w-full max-w-40" />
                    </td>
                  ))}
                </tr>
              ))}
            {!initialLoading &&
              sorted.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  onClick={click ? () => click(row) : undefined}
                  onKeyDown={
                    click
                      ? (e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            click(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={click ? 0 : undefined}
                  className={cn(
                    "border-b border-line last:border-0",
                    click && "cursor-pointer hover:bg-surface-2/70 focus-visible:bg-brand-soft/40 focus-visible:outline-none",
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        cellPad,
                        "align-middle text-ink-2",
                        c.align === "right" && "text-right tabular-nums",
                        c.align === "center" && "text-center",
                        c.hideBelow && hideClass[c.hideBelow],
                        c.className,
                      )}
                    >
                      {c.cell(row, i)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
        {!initialLoading && sorted.length === 0 && (
          <EmptyState icon={empty?.icon ?? <Inbox />} title={empty?.title ?? "Nothing here yet"} description={empty?.description} action={empty?.action} />
        )}
      </div>
      {error && rows?.length ? <p className="border-t border-line bg-danger/5 px-4 py-2 text-sm text-danger">{error.message}</p> : null}
      {pagination && pagination.totalPages > 1 && <PaginationBar {...pagination} />}
    </Card>
  );
}

export function PaginationBar({ page, totalPages, total, limit, onPageChange }: Pagination) {
  const from = limit ? (page - 1) * limit + 1 : null;
  const to = limit ? Math.min(total, page * limit) : null;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-sm text-muted">
      <span>{from ? `${from}–${to} of ${total.toLocaleString("en-IN")}` : `${total.toLocaleString("en-IN")} total`}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md p-1.5 hover:bg-surface-2 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-2 text-ink">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md p-1.5 hover:bg-surface-2 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}

/** Builds DataTable pagination props from a Paginated<T> response, bound to the `page` URL param. */
export function useUrlPagination<T>(data: Paginated<T> | undefined): Pagination | undefined {
  const { set } = useUrlParams();
  if (!data) return undefined;
  return { page: data.page, totalPages: data.totalPages, total: data.total, limit: data.limit, onPageChange: (p) => set({ page: p }) };
}
