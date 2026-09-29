import { CategoryPage, categoryMetadata } from "@/components/site/search/category-page";

export const metadata = categoryMetadata("VILLA");

export default function VillasPage(props: PageProps<"/villas">) {
  return <CategoryPage type="VILLA" searchParams={props.searchParams} />;
}
