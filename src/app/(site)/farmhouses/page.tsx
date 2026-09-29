import { CategoryPage, categoryMetadata } from "@/components/site/search/category-page";

export const metadata = categoryMetadata("FARMHOUSE");

export default function FarmhousesPage(props: PageProps<"/farmhouses">) {
  return <CategoryPage type="FARMHOUSE" searchParams={props.searchParams} />;
}
