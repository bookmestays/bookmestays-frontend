import "server-only";
import { cookies } from "next/headers";
import { ApiError, buildQuery } from "./api";

// Server-side API client for Server Components / Route Handlers.
// Talks to the backend directly and forwards the visitor's auth cookies.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

type Options = {
  query?: Parameters<typeof buildQuery>[0];
  /** seconds to cache public data; omit for no-store (personalised data) */
  revalidate?: number;
  tags?: string[];
  method?: string;
  body?: unknown;
};

export async function serverApi<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${BACKEND_URL}${path}${buildQuery(opts.query)}`, {
    method: opts.method ?? "GET",
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    ...(opts.revalidate !== undefined
      ? { next: { revalidate: opts.revalidate, tags: opts.tags } }
      : { cache: "no-store" as const }),
  });
  const data = res.headers.get("content-type")?.includes("application/json") ? await res.json() : null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.code ?? "ERROR", data?.error?.message ?? res.statusText);
  }
  return data as T;
}

/** Public (cookie-less, cacheable) fetch for SEO pages. Returns null on 404. */
export async function publicApi<T = unknown>(path: string, opts: Omit<Options, "method" | "body"> = {}): Promise<T | null> {
  const res = await fetch(`${BACKEND_URL}${path}${buildQuery(opts.query)}`, {
    next: { revalidate: opts.revalidate ?? 60, tags: opts.tags },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(res.status, "ERROR", `API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}
