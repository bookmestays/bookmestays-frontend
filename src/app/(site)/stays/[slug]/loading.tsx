import { Skeleton } from "@/components/ui";

export default function PropertyLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading stay">
      <Skeleton className="h-4 w-60" />
      <Skeleton className="mt-4 aspect-[16/10] w-full rounded-2xl md:aspect-auto md:h-[420px]" />
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-6 h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <Skeleton className="hidden h-96 w-full rounded-2xl lg:block" />
      </div>
    </div>
  );
}
