import "server-only";
import { cache } from "react";
import { publicApi } from "./api-server";
import type { SiteMeta } from "./types";

// Safe wrappers around publicApi for the guest website: the site must render
// (with fallbacks) even when the backend is down or an endpoint isn't live yet.

export type Loaded<T> = { data: T; error: false } | { data: null; error: true } | { data: null; error: false };

/**
 * data=null,error=false → 404 (caller should notFound()).
 * data=null,error=true  → network / 5xx (caller should show an error state).
 */
export async function loadPublic<T>(path: string, opts?: Parameters<typeof publicApi>[1]): Promise<Loaded<T>> {
  try {
    const data = await publicApi<T>(path, opts);
    return data === null ? { data: null, error: false } : { data, error: false };
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.warn(`[public-data] ${path}:`, (e as Error).message);
    return { data: null, error: true };
  }
}

/**
 * For statically cached (ISR) pages: if data failed to load at request time, throw so Next.js keeps serving the
 * last good version of the page instead of caching an error state. During `next build` we render the fallback
 * instead, so a build never fails just because the API is unreachable.
 */
export function keepStaleOnError<T>(r: Loaded<T>): Loaded<T> {
  if (r.error && process.env.NEXT_PHASE !== "phase-production-build") throw new Error("Public API unavailable");
  return r;
}

/** Same as loadPublic but collapses every failure to a fallback value (for optional page sections). */
export async function loadOr<T>(path: string, fallback: T, opts?: Parameters<typeof publicApi>[1]): Promise<T> {
  const r = await loadPublic<T>(path, opts);
  return r.data ?? fallback;
}

const EMPTY_META: SiteMeta = {
  cities: [],
  propertyTypes: [],
  travelTags: [],
  amenities: [],
  support: { phone: "", email: "", whatsapp: "", social: {} },
};

/** Site-wide meta (cities, amenities, support). Deduped per request, cached 5 min. */
export const getSiteMeta = cache(() => loadOr<SiteMeta>("/public/meta", EMPTY_META, { revalidate: 300, tags: ["meta"] }));

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
