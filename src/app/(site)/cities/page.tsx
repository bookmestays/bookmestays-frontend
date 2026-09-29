import type { Metadata } from "next";
import { CityTile } from "@/components/site/cards/tiles";
import { Container, PageHeader } from "@/components/site/primitives";
import { EmptyState, ErrorState } from "@/components/ui";
import { keepStaleOnError, loadPublic } from "@/lib/public-data";
import type { CityCard } from "@/lib/types";

export const metadata: Metadata = {
  title: "Explore stays by city",
  description: "Find hotels, villas, farmhouses, homestays and heritage stays in India's favourite destinations.",
  alternates: { canonical: "/cities" },
};

export default async function CitiesPage() {
  const res = keepStaleOnError(await loadPublic<CityCard[]>("/public/cities", { revalidate: 300, tags: ["cities"] }));
  const cities = res.data ?? [];
  const featured = cities.filter((c) => c.isFeatured);
  const rest = cities.filter((c) => !c.isFeatured);
  return (
    <>
      <PageHeader title="Explore by city" subtitle="Pick a destination to see curated stays, local experiences and neighbourhood guides." />
      <Container className="py-8">
        {res.error ? (
          <ErrorState message="We couldn't load cities right now. Please refresh the page." />
        ) : cities.length === 0 ? (
          <EmptyState title="Cities coming soon" description="We're adding destinations — check back shortly." />
        ) : (
          <div className="space-y-10">
            {featured.length > 0 && (
              <section aria-labelledby="featured-cities">
                <h2 id="featured-cities" className="mb-4 text-xl font-bold text-ink">
                  Popular destinations
                </h2>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {featured.map((c) => (
                    <li key={c.id}>
                      <CityTile c={c} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {rest.length > 0 && (
              <section aria-labelledby="all-cities">
                <h2 id="all-cities" className="mb-4 text-xl font-bold text-ink">
                  {featured.length ? "More cities" : "All cities"}
                </h2>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {rest.map((c) => (
                    <li key={c.id}>
                      <CityTile c={c} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </Container>
    </>
  );
}
