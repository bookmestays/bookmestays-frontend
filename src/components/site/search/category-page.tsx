import type { Metadata } from "next";
import { PROPERTY_TYPE_LABELS, type PropertyType } from "@/lib/types";
import { TYPE_SLUGS } from "@/lib/search-params";
import { Breadcrumbs } from "../primitives";
import { SearchView } from "./search-view";

const INTRO: Record<PropertyType, string> = {
  HOTEL: "From city business hotels to boutique stays — see every room on video before you book.",
  VILLA: "Private villas with pools, gardens and space for everyone. Perfect for families and groups.",
  FARMHOUSE: "Open lawns, fresh air and weekend getaways close to the city.",
  HOMESTAY: "Stay with local hosts, eat home-cooked food and experience a place like a local.",
  HERITAGE: "Palaces, havelis and forts restored into memorable heritage stays.",
};

export function categoryMetadata(type: PropertyType): Metadata {
  return {
    title: `${PROPERTY_TYPE_LABELS[type]} in India`,
    description: `${INTRO[type]} Compare prices, amenities and video tours of ${PROPERTY_TYPE_LABELS[type].toLowerCase()} on BookMeStays.`,
    alternates: { canonical: `/${TYPE_SLUGS[type]}` },
  };
}

/** /hotels, /villas, /farmhouses, /homestays, /heritage-stays — search with a fixed property type. */
export async function CategoryPage({ type, searchParams }: { type: PropertyType; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <SearchView
      searchParams={await searchParams}
      basePath={`/${TYPE_SLUGS[type]}`}
      preset={{ type: [type] }}
      hide={["type"]}
      header={
        <div className="mb-4">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: PROPERTY_TYPE_LABELS[type] }]} />
          <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{PROPERTY_TYPE_LABELS[type]}</h1>
          <p className="mt-1 text-sm text-ink-2">{INTRO[type]}</p>
        </div>
      }
    />
  );
}
