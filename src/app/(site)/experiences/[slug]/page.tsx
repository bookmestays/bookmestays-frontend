import Link from "next/link";
import { Check, Clock, MapPin, User, X } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PropertyListCard, PropertyPosterCard } from "@/components/site/cards/property-card";
import { formatDuration, rowItem } from "@/components/site/constants";
import { MapEmbed } from "@/components/site/map-embed";
import { SmartImage } from "@/components/site/media/smart-image";
import { Breadcrumbs, Container, JsonLd, PriceTag, Prose, RatingBadge, SectionHeading } from "@/components/site/primitives";
import { PropertyGallery } from "@/components/site/property/gallery";
import { ShareButton, TrackView } from "@/components/site/property/property-client-bits";
import { ScrollRow } from "@/components/site/scroll-row";
import { WishlistButton } from "@/components/site/wishlist-context";
import { Card, ErrorState } from "@/components/ui";
import { loadPublic, SITE_URL } from "@/lib/public-data";
import type { ExperienceDetail } from "@/lib/types";

const getExperience = cache((slug: string) =>
  loadPublic<ExperienceDetail>(`/public/experiences/${encodeURIComponent(slug)}`, { revalidate: 120, tags: [`experience:${slug}`] }),
);

export async function generateMetadata(props: PageProps<"/experiences/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const { data: e } = await getExperience(slug);
  if (!e) return { title: "Experience not found" };
  const title = e.seo?.title ?? `${e.title}${e.cityName ? ` in ${e.cityName}` : ""}`;
  const description = e.seo?.description ?? e.shortDescription ?? `Experience ${e.title} with BookMeStays.`;
  const image = e.seo?.ogImage ?? e.coverImageUrl;
  return { title, description, alternates: { canonical: `/experiences/${e.slug}` }, openGraph: { title, description, images: image ? [{ url: image }] : undefined } };
}

export default async function ExperiencePage(props: PageProps<"/experiences/[slug]">) {
  const { slug } = await props.params;
  const res = await getExperience(slug);
  if (res.error)
    return (
      <Container className="py-16">
        <ErrorState message="We couldn't load this experience right now. Please refresh the page." />
      </Container>
    );
  const e = res.data;
  if (!e) notFound();
  const duration = formatDuration(e.durationMinutes);

  return (
    <Container className="py-6">
      <TrackView event="experience_viewed" props={{ experienceId: e.id, slug: e.slug, city: e.citySlug }} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TouristAttraction",
          name: e.title,
          description: e.shortDescription ?? undefined,
          image: e.coverImageUrl ?? undefined,
          url: `${SITE_URL}/experiences/${e.slug}`,
          address: e.location ?? e.cityName ?? undefined,
          geo: e.lat != null && e.lng != null ? { "@type": "GeoCoordinates", latitude: e.lat, longitude: e.lng } : undefined,
          aggregateRating: e.ratingCount > 0 ? { "@type": "AggregateRating", ratingValue: e.ratingAvg, reviewCount: e.ratingCount } : undefined,
        }}
      />
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Experiences", href: "/experiences" },
          ...(e.citySlug && e.cityName ? [{ name: e.cityName, href: `/experiences?city=${e.citySlug}` }] : []),
          { name: e.title },
        ]}
      />
      <div className="mt-4">
        {e.media.length > 0 ? (
          <PropertyGallery media={e.media} name={e.title} propertyId={e.id} />
        ) : (
          <div className="relative aspect-[16/7] overflow-hidden rounded-2xl bg-surface-2">
            <SmartImage src={e.coverImageUrl} alt={e.title} fill sizes="100vw" className="object-cover" loading="eager" fetchPriority="high" />
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ink sm:text-3xl">{e.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
                {(e.location || e.cityName) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-4 text-muted" aria-hidden /> {e.location ?? e.cityName}
                  </span>
                )}
                {duration && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-4 text-muted" aria-hidden /> {duration}
                  </span>
                )}
                <RatingBadge value={e.ratingAvg} count={e.ratingCount} />
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <ShareButton title={e.title} />
              <WishlistButton type="EXPERIENCE" id={e.id} name={e.title} variant="plain" />
            </div>
          </div>

          {e.shortDescription && <p className="text-base font-medium text-ink">{e.shortDescription}</p>}
          {e.story && (
            <section aria-labelledby="story">
              <h2 id="story" className="text-xl font-bold text-ink">
                The story
              </h2>
              <Prose text={e.story} className="mt-3" />
            </section>
          )}

          {(e.included.length > 0 || e.excluded.length > 0) && (
            <section aria-labelledby="incl" className="grid gap-6 sm:grid-cols-2">
              <h2 id="incl" className="sr-only">
                What&apos;s included
              </h2>
              {e.included.length > 0 && (
                <div>
                  <h3 className="font-semibold text-ink">Included</h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
                    {e.included.map((x) => (
                      <li key={x} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {x}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {e.excluded.length > 0 && (
                <div>
                  <h3 className="font-semibold text-ink">Not included</h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
                    {e.excluded.map((x) => (
                      <li key={x} className="flex gap-2">
                        <X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden /> {x}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {e.suitableFor.length > 0 && (
            <section aria-labelledby="suitable">
              <h2 id="suitable" className="text-lg font-semibold text-ink">
                Suitable for
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {e.suitableFor.map((s) => (
                  <li key={s} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-ink-2">
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(e.hostName || e.hostInfo) && (
            <section aria-labelledby="host" className="flex gap-4 rounded-xl bg-surface-2 p-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-ink">
                <User className="size-5" aria-hidden />
              </span>
              <div>
                <h2 id="host" className="font-semibold text-ink">
                  Hosted by {e.hostName ?? "a local expert"}
                </h2>
                {e.hostInfo && <p className="mt-1 text-sm text-ink-2">{e.hostInfo}</p>}
              </div>
            </section>
          )}

          {(e.meetingPoint || (e.lat != null && e.lng != null)) && (
            <section aria-labelledby="where">
              <h2 id="where" className="text-xl font-bold text-ink">
                Where you&apos;ll meet
              </h2>
              {e.meetingPoint && <p className="mt-2 text-sm text-ink-2">{e.meetingPoint}</p>}
              <MapEmbed lat={e.lat} lng={e.lng} label={e.title} className="mt-3 h-64" />
            </section>
          )}

          {e.property && (
            <section aria-labelledby="hosted-at">
              <h2 id="hosted-at" className="mb-3 text-xl font-bold text-ink">
                Offered at
              </h2>
              <PropertyListCard p={e.property} />
            </section>
          )}
        </div>

        <aside aria-label="Booking information">
          <Card className="sticky top-4 space-y-3 p-5">
            {e.price != null ? <PriceTag paise={e.price} suffix="/person" /> : <p className="text-sm text-muted">Price on request</p>}
            {e.availabilityNote && <p className="text-sm text-ink-2">{e.availabilityNote}</p>}
            {e.isBookable ? (
              <p className="rounded-lg bg-success/10 p-3 text-sm text-ink-2">
                This experience can be added to your stay. Contact our team after booking and we&apos;ll arrange it for your dates.
              </p>
            ) : (
              <p className="rounded-lg bg-surface-2 p-3 text-sm text-ink-2">
                Online booking for experiences is coming soon. Book a nearby stay and our team can help you arrange it.
              </p>
            )}
            <Link href="/help#booking-support" className="inline-block text-sm font-medium text-brand hover:underline">
              Ask about this experience
            </Link>
          </Card>
        </aside>
      </div>

      {e.relatedStays.length > 0 && (
        <section className="mt-10 border-t border-line pt-8">
          <SectionHeading title="Stays nearby" href={e.citySlug ? `/cities/${e.citySlug}` : undefined} />
          <ScrollRow label="Stays nearby">
            {e.relatedStays.map((p) => (
              <PropertyPosterCard key={p.id} p={p} className={rowItem.poster} />
            ))}
          </ScrollRow>
        </section>
      )}
    </Container>
  );
}
