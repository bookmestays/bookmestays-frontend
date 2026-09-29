"use client";

import { useApi } from "@/lib/use-api";
import type { Paginated, SiteMeta } from "@/lib/types";

/** Accepts either a plain array or a Paginated<T> response and returns the items. */
export function asList<T>(x: T[] | Paginated<T> | { items?: T[] } | null | undefined): T[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  return x.items ?? [];
}

/** Trims strings and converts "" → null (backend validates optional patterns strictly). */
export function nullIfEmpty(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** Like nullIfEmpty but returns undefined, so the key is omitted from JSON bodies. */
export function omitIfEmpty(v: string | null | undefined): string | undefined {
  return nullIfEmpty(v) ?? undefined;
}

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}
export function todayISO() {
  return toISODate(new Date());
}

/** ISO timestamp → value for <input type="datetime-local"> */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromLocalInput(v: string) {
  return v ? new Date(v).toISOString() : null;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);

/** Site metadata (cities, property types, travel tags, amenities). */
export function useSiteMeta() {
  return useApi<SiteMeta>("/public/meta");
}

export const GSTIN_RE = /^[0-9]{2}[0-9A-Z]{13}$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^\+?[0-9 -]{10,16}$/;
