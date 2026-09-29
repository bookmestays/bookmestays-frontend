import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PropertyListCard } from "@/components/site/cards/property-card";
import { SmartImage } from "@/components/site/media/smart-image";
import { Breadcrumbs, Container, JsonLd } from "@/components/site/primitives";
import { EmptyState, ErrorState } from "@/components/ui";
import { loadPublic, SITE_URL } from "@/lib/public-data";
import type { CollectionCard, PropertyCard } from "@/lib/types";

type Payload = { collection: CollectionCard; properties: PropertyCard[] };
const getCollection = cache((slug: string) => loadPublic<Payload>(`/public/collections/${encodeURIComponent(slug)}`, { revalidate: 300, tags: [`collection:${slug}`] }));

export async function generateMetadata(props: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { data } = await getCollection((await props.params).slug);
  if (!data) return { title: "Collection not found" };
  const c = data.collection;
  return {
    title: c.title,
    description: c.description ?? `${c.propertyCount} handpicked stays: ${c.title}.`,
    alternates: { canonical: `/collections/${c.slug}` },
    openGraph: { title: c.title, images: c.coverImageUrl ? [{ url: c.coverImageUrl }] : undefined },
  };
}

export default async function CollectionPage(props: PageProps<"/collections/[slug]">) {
  const res = await getCollection((await props.params).slug);
  if (res.error)
    return (
      <Container className="py-16">
        <ErrorState message="We couldn't load this collection right now. Please refresh the page." />
      </Container>
    );
  if (!res.data) notFound();
  const { collection: c, properties } = res.data;
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: c.title,
          itemListElement: properties.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/stays/${p.slug}`, name: p.name })),
        }}
      />
      <section className="relative isolate overflow-hidden bg-ink">
        <SmartImage src={c.coverImageUrl} alt={c.title} fill sizes="100vw" className="-z-10 object-cover opacity-55" loading="eager" fetchPriority="high" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 to-black/20" />
        <Container className="py-10 text-white sm:py-16">
          <div className="[&_a]:text-white/80 [&_span]:text-white/90 [&_svg]:text-white/60">
            <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Collections", href: "/collections" }, { name: c.title }]} />
          </div>
          <h1 className="mt-6 text-3xl font-bold sm:text-4xl">{c.title}</h1>
          {c.description && <p className="mt-2 max-w-2xl text-white/85">{c.description}</p>}
          <p className="mt-2 text-sm text-white/70">{properties.length} stays</p>
        </Container>
      </section>
      <Container className="py-8">
        {properties.length === 0 ? (
          <EmptyState title="No stays in this collection yet" />
        ) : (
          <ul className="flex flex-col gap-4">
            {properties.map((p, i) => (
              <li key={p.id}>
                <PropertyListCard p={p} eager={i < 2} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
