import { CheckCircle2, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ExperienceCard } from "@/components/site/cards/experience-card";
import { PropertyPosterCard } from "@/components/site/cards/property-card";
import { rowItem, TYPE_SINGULAR } from "@/components/site/constants";
import { SmartImage } from "@/components/site/media/smart-image";
import { Breadcrumbs, Container, JsonLd, Prose, RatingBadge, SectionHeading } from "@/components/site/primitives";
import { BookingProvider } from "@/components/site/property/booking-context";
import { BookingWidget, MobileBookingBar } from "@/components/site/property/booking-widget";
import { PropertyGallery, PropertyVideos } from "@/components/site/property/gallery";
import { SectionNav, ShareButton, TrackView } from "@/components/site/property/property-client-bits";
import { AmenitiesGrid, DetailSection, LocationBlock, NearbyList, RulesBlock } from "@/components/site/property/property-sections";
import { Reviews } from "@/components/site/property/reviews";
import { RoomsSection } from "@/components/site/property/rooms-section";
import { ScrollRow } from "@/components/site/scroll-row";
import { WishlistButton } from "@/components/site/wishlist-context";
import { ErrorState } from "@/components/ui";
import { formatINR } from "@/lib/format";
import { loadOr, loadPublic, SITE_URL } from "@/lib/public-data";
import { parseSearchParams, TYPE_SLUGS } from "@/lib/search-params";
import { PROPERTY_TYPE_LABELS, type PropertyCard, type PropertyDetail } from "@/lib/types";

const getProperty = cache((slug: string) =>
  loadPublic<PropertyDetail>(`/public/properties/${encodeURIComponent(slug)}`, { revalidate: 60, tags: [`property:${slug}`] }),
);

export async function generateMetadata(props: PageProps<"/stays/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const { data: p } = await getProperty(slug);
  if (!p) return { title: "Stay not found" };
  const where = [p.areaName, p.cityName].filter(Boolean).join(", ");
  const title = p.seo?.title ?? `${p.name}${where ? `, ${where}` : ""} — ${TYPE_SINGULAR[p.type]}`;
  const description =
    p.seo?.description ??
    p.shortDescription ??
    `Book ${p.name}${where ? ` in ${where}` : ""}. Watch video tours, compare rooms and book instantly${p.price ? ` from ${formatINR(p.price)}/night` : ""}.`;
  const image = p.seo?.ogImage ?? p.coverImageUrl;
  return {
    title,
    description,
    keywords: p.seo?.keywords,
    alternates: { canonical: `/stays/${p.slug}` },
    openGraph: { title, description, url: `/stays/${p.slug}`, type: "website", images: image ? [{ url: image }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

function propertyJsonLd(p: PropertyDetail) {
  const url = `${SITE_URL}/stays/${p.slug}`;
  const images = [p.coverImageUrl, ...p.media.filter((m) => m.kind === "IMAGE").map((m) => m.url)].filter(Boolean).slice(0, 8);
  return [
    {
      "@context": "https://schema.org",
      "@type": p.type === "HOTEL" ? "Hotel" : p.type === "HOMESTAY" ? "BedAndBreakfast" : "LodgingBusiness",
      "@id": url,
      name: p.name,
      url,
      description: p.shortDescription ?? p.description ?? undefined,
      image: images,
      address: {
        "@type": "PostalAddress",
        streetAddress: p.address ?? undefined,
        addressLocality: p.city?.name ?? p.cityName ?? undefined,
        addressRegion: p.city?.state ?? undefined,
        postalCode: p.pincode ?? undefined,
        addressCountry: "IN",
      },
      geo: p.lat != null && p.lng != null ? { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng } : undefined,
      starRating: p.starRating ? { "@type": "Rating", ratingValue: p.starRating } : undefined,
      aggregateRating:
        p.reviewSummary.count > 0
          ? { "@type": "AggregateRating", ratingValue: Number(p.reviewSummary.avg.toFixed(1)), reviewCount: p.reviewSummary.count, bestRating: 5, worstRating: 1 }
          : undefined,
      priceRange: p.price ? `From ${formatINR(p.price)} per night` : undefined,
      checkinTime: p.checkInTime ?? undefined,
      checkoutTime: p.checkOutTime ?? undefined,
      amenityFeature: p.amenities.slice(0, 20).map((a) => ({ "@type": "LocationFeatureSpecification", name: a.name, value: true })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        ...(p.city ? [{ "@type": "ListItem", position: 2, name: p.city.name, item: `${SITE_URL}/cities/${p.city.slug}` }] : []),
        { "@type": "ListItem", position: p.city ? 3 : 2, name: p.name, item: url },
      ],
    },
  ];
}

export default async function PropertyPage(props: PageProps<"/stays/[slug]">) {
  const { slug } = await props.params;
  const [res, sp] = await Promise.all([getProperty(slug), props.searchParams]);

  if (res.error) {
    return (
      <Container className="py-16">
        <ErrorState message="We couldn't load this stay right now. Please check your connection and refresh the page." />
      </Container>
    );
  }
  const p = res.data;
  if (!p) notFound();

  const similar = await loadOr<PropertyCard[]>(`/public/properties/${encodeURIComponent(slug)}/similar`, [], { revalidate: 300 });
  const f = parseSearchParams(sp);
  const where = [p.areaName, p.cityName].filter(Boolean).join(", ");
  const videos = p.media.filter((m) => m.kind === "VIDEO");
  const diningImages = p.media.filter((m) => m.kind === "IMAGE" && m.tag === "DINING").slice(0, 3);
  const sectionsAvailable = [
    "overview",
    "rooms",
    p.amenities.length ? "amenities" : "",
    videos.length ? "videos" : "",
    "location",
    "rules",
    "reviews",
  ].filter(Boolean);

  return (
    <BookingProvider
      slug={p.slug}
      propertyId={p.id}
      propertyName={p.name}
      initial={{ checkIn: f.checkIn ?? "", checkOut: f.checkOut ?? "", adults: f.adults, children: f.children, rooms: f.rooms }}
    >
      <JsonLd data={propertyJsonLd(p)} />
      <TrackView event="property_viewed" props={{ propertyId: p.id, slug: p.slug, city: p.citySlug, type: p.type }} />

      <Container className="pt-4 pb-28 lg:pb-12">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            ...(p.city ? [{ name: p.city.name, href: `/cities/${p.city.slug}` }] : []),
            { name: PROPERTY_TYPE_LABELS[p.type], href: `/${TYPE_SLUGS[p.type]}` },
            { name: p.name },
          ]}
        />

        <div className="mt-4">
          <PropertyGallery media={p.media} name={p.name} propertyId={p.id} />
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            {/* Name + location + rating */}
            <div id="overview" className="scroll-mt-16">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-brand uppercase">
                    {TYPE_SINGULAR[p.type]}
                    {p.starRating ? ` · ${p.starRating}-star` : ""}
                  </p>
                  <h1 className="mt-1 text-2xl leading-tight font-bold text-ink sm:text-3xl">{p.name}</h1>
                  {where && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-ink-2">
                      <MapPin className="size-4 text-muted" aria-hidden /> {where}
                      <a href="#location" className="ml-1 text-brand hover:underline">
                        View on map
                      </a>
                    </p>
                  )}
                  <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm hover:underline">
                    <RatingBadge value={p.reviewSummary.avg || p.ratingAvg} count={p.reviewSummary.count} size="md" />
                    {p.reviewSummary.count > 0 && <span className="text-ink-2">Read reviews</span>}
                  </a>
                </div>
                <div className="flex shrink-0 gap-2">
                  <ShareButton title={p.name} />
                  <WishlistButton type="PROPERTY" id={p.id} name={p.name} variant="plain" />
                </div>
              </div>

              {p.highlights.length > 0 && (
                <ul className="mt-5 grid gap-2 sm:grid-cols-2" aria-label="Key highlights">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-sm text-ink">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {h}
                    </li>
                  ))}
                </ul>
              )}

              {(p.shortDescription || p.description) && (
                <div className="mt-6">
                  <h2 className="text-xl font-bold text-ink">About this stay</h2>
                  {p.shortDescription && <p className="mt-3 font-medium text-ink">{p.shortDescription}</p>}
                  {p.description && (
                    <details className="group mt-2">
                      <summary className="cursor-pointer list-none text-sm text-ink-2 [&::-webkit-details-marker]:hidden">
                        <Prose text={p.description.slice(0, 280) + (p.description.length > 280 ? "…" : "")} className="group-open:hidden" />
                        {p.description.length > 280 && (
                          <span className="mt-1 inline-block font-medium text-brand group-open:hidden">Read more</span>
                        )}
                      </summary>
                      <Prose text={p.description} />
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6">
              <SectionNav available={sectionsAvailable} />
            </div>

            <DetailSection id="rooms" title="Rooms & stay options" subtitle="Choose your dates to see live prices, availability and cancellation terms.">
              <RoomsSection roomTypes={p.roomTypes} />
            </DetailSection>

            {p.amenities.length > 0 && (
              <DetailSection id="amenities" title="Amenities">
                <AmenitiesGrid amenities={p.amenities} />
              </DetailSection>
            )}

            {videos.length > 0 && (
              <DetailSection id="videos" title="Property videos & walkthroughs" subtitle="See the rooms, pool and surroundings before you book.">
                <PropertyVideos videos={videos} name={p.name} propertyId={p.id} />
              </DetailSection>
            )}

            {p.experiences.length > 0 && (
              <DetailSection id="experiences" title="Experiences">
                <ScrollRow label="Experiences at this stay">
                  {p.experiences.map((e) => (
                    <ExperienceCard key={e.id} e={e} className="w-[75%] shrink-0 snap-start sm:w-[45%] lg:w-[calc((100%-2rem)/3)]" />
                  ))}
                </ScrollRow>
              </DetailSection>
            )}

            {(p.foodAndDining || diningImages.length > 0) && (
              <DetailSection id="dining" title="Food & dining">
                <Prose text={p.foodAndDining} />
                {diningImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {diningImages.map((m) => (
                      <div key={m.id} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-2">
                        <SmartImage src={m.url} alt={m.caption ?? "Dining"} fill sizes="(max-width: 640px) 33vw, 240px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </DetailSection>
            )}

            {p.nearby.length > 0 && (
              <DetailSection id="nearby" title="Things to do nearby">
                <NearbyList places={p.nearby} />
              </DetailSection>
            )}

            <DetailSection id="location" title="Location">
              <LocationBlock name={p.name} address={[p.address, p.city?.name, p.pincode].filter(Boolean).join(", ") || null} lat={p.lat} lng={p.lng} />
            </DetailSection>

            <DetailSection id="rules" title="Property rules & policies">
              <RulesBlock checkInTime={p.checkInTime} checkOutTime={p.checkOutTime} houseRules={p.houseRules} policy={p.cancellationPolicy} terms={p.terms} />
            </DetailSection>

            <DetailSection id="reviews" title="Guest reviews">
              <Reviews slug={p.slug} summary={p.reviewSummary} initial={p.topReviews} />
            </DetailSection>
          </div>

          <aside aria-label="Book this stay" className="hidden lg:block">
            <div className="sticky top-4">
              <BookingWidget startingPrice={p.price} />
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <section aria-label="Similar stays" className="mt-4 border-t border-line pt-8">
            <SectionHeading title="Similar stays" href={p.citySlug ? `/cities/${p.citySlug}` : undefined} hrefLabel="More in this city" />
            <ScrollRow label="Similar stays">
              {similar.map((s) => (
                <PropertyPosterCard key={s.id} p={s} className={rowItem.poster} />
              ))}
            </ScrollRow>
          </section>
        )}

        {p.city && (
          <p className="mt-8 text-sm text-muted">
            Looking for something else?{" "}
            <Link href={`/cities/${p.city.slug}`} className="font-medium text-brand hover:underline">
              See all stays in {p.city.name}
            </Link>
          </p>
        )}
      </Container>

      <MobileBookingBar startingPrice={p.price} />
    </BookingProvider>
  );
}
