import type { Metadata } from "next";
import { SearchView } from "@/components/site/search/search-view";
import { getSiteMeta } from "@/lib/public-data";
import { parseSearchParams } from "@/lib/search-params";

export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const f = parseSearchParams(await props.searchParams);
  const meta = await getSiteMeta();
  const city = f.city ? (meta.cities.find((c) => c.slug === f.city)?.name ?? f.city) : undefined;
  const where = city ?? f.q;
  return {
    title: where ? `Stays in ${where}` : "Search stays",
    description: `Compare hotels, villas, farmhouses, homestays and heritage stays${where ? ` in ${where}` : ""} with video tours, clear pricing and instant booking.`,
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage(props: PageProps<"/search">) {
  return <SearchView searchParams={await props.searchParams} basePath="/search" />;
}
