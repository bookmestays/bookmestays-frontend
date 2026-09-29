import type { MetadataRoute } from "next";
import { loadOr, SITE_URL } from "@/lib/public-data";
import type { CityCard, CollectionCard, ExperienceCard, Paginated, PropertyCard } from "@/lib/types";

export const revalidate = 3600;

const STATIC = [
  "", "/search", "/cities", "/experiences", "/collections", "/videos",
  "/hotels", "/villas", "/farmhouses", "/homestays", "/heritage-stays",
  "/travel/couples", "/travel/family", "/travel/friends", "/travel/corporate",
  "/about", "/contact", "/careers", "/partner-with-us", "/help",
  "/terms", "/privacy", "/refund-policy", "/cancellation-policy",
];

async function allPages<T>(path: string, limit = 100, maxPages = 20): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await loadOr<Paginated<T> | null>(path, null, { query: { page, limit }, revalidate: 3600 });
    if (!res) break;
    out.push(...res.items);
    if (page >= res.totalPages) break;
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [cities, collections, properties, experiences] = await Promise.all([
    loadOr<CityCard[]>("/public/cities", [], { revalidate: 3600 }),
    loadOr<CollectionCard[]>("/public/collections", [], { revalidate: 3600 }),
    allPages<PropertyCard>("/public/search"),
    allPages<ExperienceCard>("/public/experiences"),
  ]);
  return [
    ...STATIC.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.6 })),
    ...cities.map((c) => ({ url: `${SITE_URL}/cities/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...properties.map((p) => ({ url: `${SITE_URL}/stays/${p.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.9 })),
    ...experiences.map((e) => ({ url: `${SITE_URL}/experiences/${e.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...collections.map((c) => ({ url: `${SITE_URL}/collections/${c.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
