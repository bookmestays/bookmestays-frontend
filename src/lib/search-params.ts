// Search filters <-> URL. Shared by server pages (searchParams prop) and client components.
// URL prices are in RUPEES for readability; the API expects paise (see toApiQuery).
import type { PropertyType, TravelTag } from "./types";

export type SortKey = "recommended" | "popular" | "price_asc" | "price_desc" | "rating" | "newest";
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "popular", label: "Most booked" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
];

export type SearchFilters = {
  q?: string;
  city?: string;
  area?: string;
  type: PropertyType[];
  tags: TravelTag[];
  checkIn?: string;
  checkOut?: string;
  adults: number;
  children: number;
  rooms: number;
  minPrice?: number; // rupees
  maxPrice?: number; // rupees
  amenities: string[];
  rating?: number;
  sort: SortKey;
  page: number;
  view: "list" | "map";
};

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

const PROPERTY_TYPES: PropertyType[] = ["HOTEL", "VILLA", "FARMHOUSE", "HOMESTAY", "HERITAGE"];
const TRAVEL_TAGS: TravelTag[] = ["CORPORATE", "FAMILY", "COUPLES", "FRIENDS"];
const SORTS = SORT_OPTIONS.map((s) => s.value);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getAll(p: RawParams, key: string): string[] {
  if (p instanceof URLSearchParams) return p.getAll(key).flatMap((v) => v.split(","));
  const v = p[key];
  if (v === undefined) return [];
  return (Array.isArray(v) ? v : [v]).flatMap((x) => x.split(","));
}
const getOne = (p: RawParams, key: string) => getAll(p, key)[0]?.trim() || undefined;
const num = (v: string | undefined, min: number, max: number, fallback?: number) => {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

export function parseSearchParams(p: RawParams): SearchFilters {
  let checkIn = getOne(p, "checkIn");
  let checkOut = getOne(p, "checkOut");
  if (!checkIn || !DATE_RE.test(checkIn)) checkIn = undefined;
  if (!checkOut || !DATE_RE.test(checkOut)) checkOut = undefined;
  if (checkIn && checkOut && checkOut <= checkIn) checkOut = undefined;
  if (!checkIn) checkOut = undefined;
  const sort = getOne(p, "sort") as SortKey | undefined;
  return {
    q: getOne(p, "q"),
    city: getOne(p, "city"),
    area: getOne(p, "area"),
    type: getAll(p, "type").map((t) => t.toUpperCase()).filter((t): t is PropertyType => PROPERTY_TYPES.includes(t as PropertyType)),
    tags: getAll(p, "tags").map((t) => t.toUpperCase()).filter((t): t is TravelTag => TRAVEL_TAGS.includes(t as TravelTag)),
    checkIn,
    checkOut,
    adults: num(getOne(p, "adults"), 1, 30, 2)!,
    children: num(getOne(p, "children"), 0, 20, 0)!,
    rooms: num(getOne(p, "rooms"), 1, 10, 1)!,
    minPrice: num(getOne(p, "minPrice"), 0, 10_000_000),
    maxPrice: num(getOne(p, "maxPrice"), 0, 10_000_000),
    amenities: getAll(p, "amenities").filter(Boolean),
    rating: num(getOne(p, "rating"), 1, 5),
    sort: sort && SORTS.includes(sort) ? sort : "recommended",
    page: num(getOne(p, "page"), 1, 1000, 1)!,
    view: getOne(p, "view") === "map" ? "map" : "list",
  };
}

/** Serialises filters to a URL query string (without leading "?"). Defaults are omitted. */
export function filtersToQuery(f: Partial<SearchFilters>): string {
  const u = new URLSearchParams();
  if (f.q) u.set("q", f.q);
  if (f.city) u.set("city", f.city);
  if (f.area) u.set("area", f.area);
  f.type?.forEach((t) => u.append("type", t));
  f.tags?.forEach((t) => u.append("tags", t));
  if (f.checkIn) u.set("checkIn", f.checkIn);
  if (f.checkOut) u.set("checkOut", f.checkOut);
  if (f.adults !== undefined && f.adults !== 2) u.set("adults", String(f.adults));
  if (f.children) u.set("children", String(f.children));
  if (f.rooms !== undefined && f.rooms !== 1) u.set("rooms", String(f.rooms));
  if (f.minPrice) u.set("minPrice", String(f.minPrice));
  if (f.maxPrice) u.set("maxPrice", String(f.maxPrice));
  f.amenities?.forEach((a) => u.append("amenities", a));
  if (f.rating) u.set("rating", String(f.rating));
  if (f.sort && f.sort !== "recommended") u.set("sort", f.sort);
  if (f.page && f.page > 1) u.set("page", String(f.page));
  if (f.view === "map") u.set("view", "map");
  return u.toString();
}

export const searchHref = (f: Partial<SearchFilters>) => {
  const q = filtersToQuery(f);
  return q ? `/search?${q}` : "/search";
};

/** Query object for GET /public/search (prices converted to paise). */
export function toApiQuery(f: SearchFilters, limit = 18) {
  return {
    q: f.q,
    city: f.city,
    area: f.area,
    type: f.type,
    tags: f.tags,
    checkIn: f.checkIn,
    checkOut: f.checkOut,
    adults: f.checkIn ? f.adults : undefined,
    children: f.checkIn ? f.children : undefined,
    rooms: f.checkIn ? f.rooms : undefined,
    minPrice: f.minPrice ? f.minPrice * 100 : undefined,
    maxPrice: f.maxPrice ? f.maxPrice * 100 : undefined,
    amenities: f.amenities,
    rating: f.rating,
    sort: f.sort,
    page: f.page,
    limit,
  };
}

/** Stay-context query (dates + guests) appended to property links so the detail page keeps the selection. */
export function stayQuery(f: Pick<SearchFilters, "checkIn" | "checkOut" | "adults" | "children" | "rooms">) {
  if (!f.checkIn || !f.checkOut) return "";
  return `?${filtersToQuery({ checkIn: f.checkIn, checkOut: f.checkOut, adults: f.adults, children: f.children, rooms: f.rooms })}`;
}

// ─── Stay-date helpers (local time, "YYYY-MM-DD") ─────────────────────────────
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseISODate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
};
export const todayISO = () => toISODate(new Date());
export const nightsBetween = (a: string, b: string) =>
  Math.max(0, Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000));

export function guestsLabel(adults: number, children: number, rooms?: number) {
  const g = adults + children;
  const parts = [`${g} guest${g === 1 ? "" : "s"}`];
  if (rooms) parts.push(`${rooms} room${rooms === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

// ─── Slug helpers for category / travel pages ─────────────────────────────────
export const TYPE_SLUGS: Record<PropertyType, string> = {
  HOTEL: "hotels",
  VILLA: "villas",
  FARMHOUSE: "farmhouses",
  HOMESTAY: "homestays",
  HERITAGE: "heritage-stays",
};
export const TAG_SLUGS: Record<TravelTag, string> = {
  CORPORATE: "corporate",
  FAMILY: "family",
  COUPLES: "couples",
  FRIENDS: "friends",
};
export const tagFromSlug = (slug: string) =>
  (Object.entries(TAG_SLUGS).find(([, s]) => s === slug)?.[0] as TravelTag | undefined) ?? undefined;
