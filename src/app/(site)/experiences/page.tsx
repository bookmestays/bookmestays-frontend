import { Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ExperienceCard } from "@/components/site/cards/experience-card";
import { Container, PageHeader } from "@/components/site/primitives";
import { Pagination } from "@/components/site/search/search-view";
import { EmptyState, ErrorState } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getSiteMeta, loadPublic } from "@/lib/public-data";
import type { ExperienceCard as ExperienceCardDTO, Paginated } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/experiences">): Promise<Metadata> {
  const sp = await props.searchParams;
  const city = typeof sp.city === "string" ? sp.city : undefined;
  const meta = await getSiteMeta();
  const name = city ? (meta.cities.find((c) => c.slug === city)?.name ?? city) : undefined;
  return {
    title: name ? `Experiences in ${name}` : "Experiences & things to do",
    description: `Local experiences, food trails, tours and activities${name ? ` in ${name}` : " across India"} to pair with your stay.`,
    alternates: { canonical: city ? `/experiences?city=${city}` : "/experiences" },
  };
}

export default async function ExperiencesPage(props: PageProps<"/experiences">) {
  const sp = await props.searchParams;
  const city = typeof sp.city === "string" ? sp.city : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const [res, meta] = await Promise.all([
    loadPublic<Paginated<ExperienceCardDTO>>("/public/experiences", { query: { city, page, limit: 24 }, revalidate: 120 }),
    getSiteMeta(),
  ]);
  const cityName = city ? (meta.cities.find((c) => c.slug === city)?.name ?? city) : undefined;
  const href = (p: number) => `/experiences?${new URLSearchParams({ ...(city ? { city } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString()}`;
  const chip = "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium";

  return (
    <>
      <PageHeader
        title={cityName ? `Experiences in ${cityName}` : "Experiences"}
        subtitle="Pair your stay with the best of the place — food walks, heritage tours, nature trails and more."
      />
      <Container className="py-6">
        {meta.cities.length > 0 && (
          <nav aria-label="Filter by city" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            <Link href="/experiences" aria-current={!city ? "page" : undefined} className={cn(chip, !city ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:border-ink")}>
              All cities
            </Link>
            {meta.cities.map((c) => (
              <Link
                key={c.id}
                href={`/experiences?city=${c.slug}`}
                aria-current={city === c.slug ? "page" : undefined}
                className={cn(chip, city === c.slug ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:border-ink")}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        )}
        <div className="mt-6">
          {res.error ? (
            <ErrorState message="We couldn't load experiences right now. Please refresh the page." />
          ) : !res.data || res.data.items.length === 0 ? (
            <EmptyState icon={<Compass />} title="No experiences here yet" description="We're curating experiences for this destination. Try another city." className="rounded-xl border border-dashed border-line" />
          ) : (
            <>
              <ul className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                {res.data.items.map((e) => (
                  <li key={e.id}>
                    <ExperienceCard e={e} />
                  </li>
                ))}
              </ul>
              {res.data.totalPages > 1 && <Pagination page={page} totalPages={res.data.totalPages} href={href} />}
            </>
          )}
        </div>
      </Container>
    </>
  );
}
