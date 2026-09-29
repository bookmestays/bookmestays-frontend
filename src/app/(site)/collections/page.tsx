import type { Metadata } from "next";
import { CollectionTile } from "@/components/site/cards/tiles";
import { Container, PageHeader } from "@/components/site/primitives";
import { EmptyState, ErrorState } from "@/components/ui";
import { loadPublic } from "@/lib/public-data";
import type { CollectionCard } from "@/lib/types";

export const metadata: Metadata = {
  title: "Curated collections",
  description: "Handpicked collections of stays — pool villas, weekend getaways, heritage escapes and more.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage(props: PageProps<"/collections">) {
  const sp = await props.searchParams;
  const city = typeof sp.city === "string" ? sp.city : undefined;
  const res = await loadPublic<CollectionCard[]>("/public/collections", { query: { city }, revalidate: 300 });
  return (
    <>
      <PageHeader title="Curated collections" subtitle="Stays grouped by mood, occasion and style — picked by our team." />
      <Container className="py-8">
        {res.error ? (
          <ErrorState message="We couldn't load collections right now. Please refresh the page." />
        ) : !res.data?.length ? (
          <EmptyState title="Collections coming soon" description="Our team is curating the best stays for every occasion." />
        ) : (
          <ul className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {res.data.map((c) => (
              <li key={c.id}>
                <CollectionTile c={c} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
