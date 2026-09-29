import { CategoryPage, categoryMetadata } from "@/components/site/search/category-page";

export const metadata = categoryMetadata("HOTEL");

export default function HotelsPage(props: PageProps<"/hotels">) {
  return <CategoryPage type="HOTEL" searchParams={props.searchParams} />;
}
