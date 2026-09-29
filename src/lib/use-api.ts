"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, buildQuery } from "./api";

type Query = Parameters<typeof buildQuery>[0];

type State<T> = { token: string | null; key: string | null; data: T | undefined; error: ApiError | null };

/**
 * Client-side GET with loading / error / refetch.
 * Pass `null` as path to skip fetching (e.g. while an id is unknown).
 * While a new key loads the previous data is kept (`data`) so tables don't flash;
 * use `loading` to show progress.
 */
export function useApi<T>(path: string | null, query?: Query) {
  const key = path ? `${path}${buildQuery(query)}` : null;
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<State<T>>({ token: null, key: null, data: undefined, error: null });
  const token = key ? `${key}#${nonce}` : null;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const t = `${key}#${nonce}`;
    api<T>(key)
      .then((data) => {
        if (!cancelled) setState({ token: t, key, data, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const error = e instanceof ApiError ? e : new ApiError(0, "NETWORK", "Could not reach the server. Check your connection.");
        setState((s) => ({ token: t, key, data: s.key === key ? s.data : undefined, error }));
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  const mutate = useCallback((updater: (prev: T | undefined) => T | undefined) => setState((s) => ({ ...s, data: updater(s.data) })), []);

  const settled = token !== null && state.token === token;
  return {
    data: state.data,
    /** true when `data` belongs to the current key (not stale from a previous query) */
    fresh: state.key === key,
    error: state.key === key ? state.error : null,
    loading: key !== null && !settled,
    refetch,
    mutate,
  };
}

/** Normalises any thrown value into a user-presentable message. */
export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again.") {
  if (e instanceof ApiError) return e.message || fallback;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

/** Field errors from a 422 VALIDATION response, if the backend sent them as `{ field: message }` or an array of `{ path, message }`. */
export function fieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError) || !e.details) return {};
  const d = e.details as unknown;
  const out: Record<string, string> = {};
  if (Array.isArray(d)) {
    for (const item of d) {
      if (item && typeof item === "object") {
        const it = item as { path?: string | string[]; field?: string; message?: string };
        const k = Array.isArray(it.path) ? it.path.join(".") : (it.path ?? it.field);
        if (k && it.message) out[String(k).replace(/^\//, "").replace(/\//g, ".")] = it.message;
      }
    }
  } else if (typeof d === "object" && d) {
    for (const [k, v] of Object.entries(d as Record<string, unknown>)) if (typeof v === "string") out[k] = v;
  }
  return out;
}
