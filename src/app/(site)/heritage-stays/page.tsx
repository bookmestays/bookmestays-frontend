import { CategoryPage, categoryMetadata } from "@/components/site/search/category-page";

export const metadata = categoryMetadata("HERITAGE");

export default function HeritageStaysPage(props: PageProps<"/heritage-stays">) {
  return <CategoryPage type="HERITAGE" searchParams={props.searchParams} />;
}
