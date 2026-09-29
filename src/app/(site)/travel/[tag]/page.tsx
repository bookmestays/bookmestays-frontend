import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/site/primitives";
import { SearchView } from "@/components/site/search/search-view";
import { tagFromSlug } from "@/lib/search-params";
import { TRAVEL_TAG_LABELS, type TravelTag } from "@/lib/types";

const COPY: Record<TravelTag, { title: string; intro: string }> = {
  COUPLES: { title: "Stays for couples", intro: "Romantic villas, private pools and quiet heritage escapes for two." },
  FAMILY: { title: "Family-friendly stays", intro: "Spacious rooms, kid-friendly amenities and easy days out for the whole family." },
  FRIENDS: { title: "Stays for friends", intro: "Farmhouses and villas with room to gather, cook, swim and celebrate." },
  CORPORATE: { title: "Corporate & business stays", intro: "Reliable Wi-Fi, work-ready rooms and convenient locations for work trips and offsites." },
};

export function generateStaticParams() {
  return ["couples", "family", "friends", "corporate"].map((tag) => ({ tag }));
}

export async function generateMetadata(props: PageProps<"/travel/[tag]">): Promise<Metadata> {
  const tag = tagFromSlug((await props.params).tag);
  if (!tag) return {};
  return {
    title: COPY[tag].title,
    description: `${COPY[tag].intro} Book ${TRAVEL_TAG_LABELS[tag].toLowerCase()} stays across India on BookMeStays.`,
    alternates: { canonical: `/travel/${(await props.params).tag}` },
  };
}

export default async function TravelPage(props: PageProps<"/travel/[tag]">) {
  const { tag: slug } = await props.params;
  const tag = tagFromSlug(slug);
  if (!tag) notFound();
  return (
    <SearchView
      searchParams={await props.searchParams}
      basePath={`/travel/${slug}`}
      preset={{ tags: [tag] }}
      header={
        <div className="mb-4">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Travel" }, { name: TRAVEL_TAG_LABELS[tag] }]} />
          <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{COPY[tag].title}</h1>
          <p className="mt-1 text-sm text-ink-2">{COPY[tag].intro}</p>
        </div>
      }
    />
  );
}
