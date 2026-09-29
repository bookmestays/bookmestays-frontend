import { Film } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { VideoCard } from "@/components/site/cards/video-card";
import { Container, PageHeader } from "@/components/site/primitives";
import { EmptyState, ErrorState } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getSiteMeta, loadPublic } from "@/lib/public-data";
import { PROPERTY_TYPE_LABELS, type PropertyType, type VideoFeedItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "Video tours of stays",
  description: "Browse short video walkthroughs of rooms, pools and surroundings. See it before you book it.",
  alternates: { canonical: "/videos" },
};

export default async function VideosPage(props: PageProps<"/videos">) {
  const sp = await props.searchParams;
  const city = typeof sp.city === "string" ? sp.city : undefined;
  const type = typeof sp.type === "string" && sp.type in PROPERTY_TYPE_LABELS ? (sp.type as PropertyType) : undefined;
  const [res, meta] = await Promise.all([loadPublic<VideoFeedItem[]>("/public/videos", { query: { city, type, limit: 36 }, revalidate: 120 }), getSiteMeta()]);
  const href = (patch: { city?: string | null; type?: string | null }) => {
    const q = new URLSearchParams();
    const c = patch.city === undefined ? city : patch.city;
    const t = patch.type === undefined ? type : patch.type;
    if (c) q.set("city", c);
    if (t) q.set("type", t);
    const s = q.toString();
    return s ? `/videos?${s}` : "/videos";
  };
  const chip = (active: boolean) => cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium", active ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:border-ink");

  return (
    <>
      <PageHeader title="See it before you book it" subtitle="Short video tours of real rooms, pools and views. Hover or scroll to preview — tap to open the stay." />
      <Container className="py-6">
        <div className="space-y-2">
          <nav aria-label="Filter by type" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Link href={href({ type: null })} className={chip(!type)}>
              All types
            </Link>
            {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
              <Link key={t} href={href({ type: t })} className={chip(type === t)}>
                {PROPERTY_TYPE_LABELS[t]}
              </Link>
            ))}
          </nav>
          {meta.cities.length > 0 && (
            <nav aria-label="Filter by city" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <Link href={href({ city: null })} className={chip(!city)}>
                All cities
              </Link>
              {meta.cities.map((c) => (
                <Link key={c.id} href={href({ city: c.slug })} className={chip(city === c.slug)}>
                  {c.name}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="mt-6">
          {res.error ? (
            <ErrorState message="We couldn't load videos right now. Please refresh the page." />
          ) : !res.data?.length ? (
            <EmptyState icon={<Film />} title="No video tours yet" description="Try another city or property type." className="rounded-xl border border-dashed border-line" />
          ) : (
            <ul className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {res.data.map((it) => (
                <li key={it.media.id}>
                  <VideoCard item={it} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </>
  );
}
