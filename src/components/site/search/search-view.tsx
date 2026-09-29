import { CalendarX2, ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass, EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { getSiteMeta, loadPublic } from "@/lib/public-data";
import { filtersToQuery, guestsLabel, parseSearchParams, stayQuery, toApiQuery, type SearchFilters } from "@/lib/search-params";
import type { Paginated, PropertyCard } from "@/lib/types";
import { PropertyListCard } from "../cards/property-card";
import { Container } from "../primitives";
import { ResultsMap } from "./results-map";
import { FiltersPanel, MobileFilterButton, ResultsPending, SearchShell, SortSelect, ViewToggle } from "./search-controls";
import { StaySearchForm } from "./stay-search-form";

type SearchResponse = Paginated<PropertyCard> & { facets?: unknown };
const PAGE_SIZE = 18;

/**
 * Shared results view for /search, /hotels, /villas…, /travel/[tag].
 * `preset` filters come from the route (not the URL) and are merged into the API query.
 */
export async function SearchView({
  searchParams,
  basePath,
  preset = {},
  hide = [],
  header,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  basePath: string;
  preset?: Partial<Pick<SearchFilters, "type" | "tags">>;
  hide?: ("type" | "tags")[];
  header?: ReactNode;
}) {
  const urlFilters = parseSearchParams(searchParams);
  const filters: SearchFilters = {
    ...urlFilters,
    type: preset.type?.length ? preset.type : urlFilters.type,
    tags: preset.tags?.length ? Array.from(new Set([...preset.tags, ...urlFilters.tags])) : urlFilters.tags,
  };
  const [res, meta] = await Promise.all([
    loadPublic<SearchResponse>("/public/search", { query: toApiQuery(filters, PAGE_SIZE), revalidate: 30 }),
    getSiteMeta(),
  ]);

  const cityName = filters.city ? (meta.cities.find((c) => c.slug === filters.city)?.name ?? filters.city) : undefined;
  const whereLabel = cityName ?? filters.q;
  const items = res.data?.items ?? [];
  const total = res.data?.total ?? 0;
  const totalPages = res.data?.totalPages ?? 1;
  const query = stayQuery(filters);
  const hasFilters =
    urlFilters.type.length + urlFilters.tags.length + urlFilters.amenities.length > 0 || !!(urlFilters.minPrice || urlFilters.maxPrice || urlFilters.rating);
  const pageHref = (page: number) => {
    const q = filtersToQuery({ ...urlFilters, page });
    return q ? `${basePath}?${q}` : basePath;
  };
  const clearHref = (patch: Partial<SearchFilters>) => {
    const q = filtersToQuery({ ...urlFilters, ...patch, page: 1 });
    return q ? `${basePath}?${q}` : basePath;
  };

  return (
    <SearchShell filters={urlFilters} basePath={basePath} hide={hide}>
      <div className="border-b border-line bg-surface-2">
        <Container className="py-4">
          {header}
          <StaySearchForm key={filtersToQuery(urlFilters)} cities={meta.cities} initial={{ ...urlFilters, type: filters.type, tags: filters.tags }} initialWhere={whereLabel} variant="bar" />
        </Container>
      </div>

      <Container className="py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-ink" aria-live="polite">
              {res.error ? "Search unavailable" : `${total.toLocaleString("en-IN")} stay${total === 1 ? "" : "s"}${whereLabel ? ` in ${whereLabel}` : ""}`}
            </p>
            <p className="text-sm text-muted">
              {filters.checkIn && filters.checkOut
                ? `${formatDate(filters.checkIn, { day: "numeric", month: "short" })} – ${formatDate(filters.checkOut, { day: "numeric", month: "short" })} · ${guestsLabel(filters.adults, filters.children, filters.rooms)}`
                : "Add dates to see live prices and availability"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MobileFilterButton key={`m-${urlFilters.minPrice ?? ""}-${urlFilters.maxPrice ?? ""}`} amenities={meta.amenities} total={total} />
            <SortSelect />
            <ViewToggle />
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside aria-label="Filters" className="hidden lg:block">
            <div className="sticky top-4 rounded-xl border border-line bg-white p-4">
              <FiltersPanel key={`d-${urlFilters.minPrice ?? ""}-${urlFilters.maxPrice ?? ""}`} amenities={meta.amenities} />
            </div>
          </aside>

          <ResultsPending>
            {res.error ? (
              <EmptyState
                icon={<SearchX />}
                title="We couldn't load stays right now"
                description="This is usually temporary. Please check your connection and try again."
                action={
                  <Link href={pageHref(filters.page)} className={buttonClass("outline")}>
                    Try again
                  </Link>
                }
                className="rounded-xl border border-line"
              />
            ) : items.length === 0 ? (
              <EmptyState
                icon={filters.checkIn ? <CalendarX2 /> : <SearchX />}
                title={filters.checkIn ? "No stays available for these dates" : "No stays match your search"}
                description={
                  filters.checkIn
                    ? "Everything matching your search is booked for these dates. Try different dates or fewer rooms."
                    : "Try removing some filters, searching a nearby area, or exploring another city."
                }
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    {filters.checkIn && (
                      <Link href={clearHref({ checkIn: undefined, checkOut: undefined })} className={buttonClass("primary")}>
                        Search without dates
                      </Link>
                    )}
                    {hasFilters && (
                      <Link href={clearHref({ type: [], tags: [], amenities: [], minPrice: undefined, maxPrice: undefined, rating: undefined })} className={buttonClass("outline")}>
                        Clear filters
                      </Link>
                    )}
                    <Link href="/cities" className={buttonClass("ghost")}>
                      Browse cities
                    </Link>
                  </div>
                }
                className="rounded-xl border border-dashed border-line"
              />
            ) : filters.view === "map" ? (
              <ResultsMap items={items} query={query} />
            ) : (
              <ul className="flex flex-col gap-4">
                {items.map((p, i) => (
                  <li key={p.id}>
                    <PropertyListCard p={p} query={query} eager={i < 2} />
                  </li>
                ))}
              </ul>
            )}

            {totalPages > 1 && items.length > 0 && <Pagination page={filters.page} totalPages={totalPages} href={pageHref} />}
          </ResultsPending>
        </div>
      </Container>
    </SearchShell>
  );
}

export function Pagination({ page, totalPages, href }: { page: number; totalPages: number; href: (p: number) => string }) {
  const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages].filter((p) => p >= 1 && p <= totalPages))).sort((a, b) => a - b);
  const cls = "inline-flex size-10 items-center justify-center rounded-lg border text-sm font-medium";
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} aria-label="Previous page" className={cn(cls, "border-line hover:bg-surface-2")}>
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : null}
      {pages.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(cls, p === page ? "border-ink bg-ink text-white" : "border-line hover:bg-surface-2")}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages ? (
        <Link href={href(page + 1)} aria-label="Next page" className={cn(cls, "border-line hover:bg-surface-2")}>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </nav>
  );
}
