"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Patch = Record<string, string | number | boolean | null | undefined | string[]>;

/**
 * Read/write URL search params (filters, tabs, page). Writing uses router.replace
 * so filter changes don't spam history. Any change other than `page` resets page to 1.
 * Components using this must render inside a <Suspense> boundary (panel layouts provide one).
 */
export function useUrlParams() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const set = useCallback(
    (patch: Patch, opts: { push?: boolean } = {}) => {
      const p = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        p.delete(k);
        if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
        else if (v !== null && v !== undefined && v !== "" && v !== false) p.set(k, String(v));
      }
      if (!("page" in patch)) p.delete("page");
      const qs = p.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (opts.push) router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [sp, router, pathname],
  );

  const get = useCallback((k: string) => sp.get(k) ?? "", [sp]);
  const page = Math.max(1, Number(sp.get("page")) || 1);
  /** all params as a plain object, suitable for `api(..., { query })` */
  const query: Record<string, string | string[]> = {};
  for (const k of new Set(sp.keys())) {
    const all = sp.getAll(k);
    query[k] = all.length > 1 ? all : all[0];
  }
  return { params: sp, get, set, page, query };
}
