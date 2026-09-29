import { CategoryPage, categoryMetadata } from "@/components/site/search/category-page";

export const metadata = categoryMetadata("HOMESTAY");

export default function HomestaysPage(props: PageProps<"/homestays">) {
  return <CategoryPage type="HOMESTAY" searchParams={props.searchParams} />;
}
