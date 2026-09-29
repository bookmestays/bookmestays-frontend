import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ExperienceCard } from "@/components/site/cards/experience-card";
import { PropertyPosterCard } from "@/components/site/cards/property-card";
import { CollectionTile } from "@/components/site/cards/tiles";
import { VideoCard } from "@/components/site/cards/video-card";
import { rowItem } from "@/components/site/constants";
import { SmartImage } from "@/components/site/media/smart-image";
import { Band, Breadcrumbs, Container, JsonLd, Prose, SectionHeading } from "@/components/site/primitives";
import { ScrollRow } from "@/components/site/scroll-row";
import { StaySearchForm } from "@/components/site/search/stay-search-form";
import { ErrorState } from "@/components/ui";
import { getSiteMeta, loadPublic, SITE_URL } from "@/lib/public-data";
import { searchHref } from "@/lib/search-params";
import type { CityPage as CityPageDTO } from "@/lib/types";

const getCity = cache((slug: string) => loadPublic<CityPageDTO>(`/public/cities/${encodeURIComponent(slug)}`, { revalidate: 120, tags: [`city:${slug}`] }));

export async function generateMetadata(props: PageProps<"/cities/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const { data } = await getCity(slug);
  if (!data) return { title: "City not found" };
  const c = data.city;
  const title = c.seo?.title ?? `Best stays in ${c.name} — hotels, villas & homestays`;
  const description =
    c.seo?.description ?? c.intro ?? `Discover ${c.propertyCount} handpicked stays in ${c.name}${c.state ? `, ${c.state}` : ""} with video tours, clear prices and instant booking.`;
  const image = c.seo?.ogImage ?? c.coverImageUrl;
  return {
    title,
    description,
    keywords: c.seo?.keywords,
    alternates: { canonical: `/cities/${c.slug}` },
    openGraph: { title, description, url: `/cities/${c.slug}`, images: image ? [{ url: image }] : undefined },
  };
}

export default async function CityPage(props: PageProps<"/cities/[slug]">) {
  const { slug } = await props.params;
  const [res, meta] = await Promise.all([getCity(slug), getSiteMeta()]);
  if (res.error) {
    return (
      <Container className="py-16">
        <ErrorState message="We couldn't load this city right now. Please refresh the page." />
      </Container>
    );
  }
  if (!res.data) notFound();
  const { city, areas, featured, byType, collections, experiences, videos } = res.data;
  let band = 0;
  const tone = () => (band++ % 2 === 0 ? "white" : "grey") as "white" | "grey";

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Cities", item: `${SITE_URL}/cities` },
            { "@type": "ListItem", position: 3, name: city.name, item: `${SITE_URL}/cities/${city.slug}` },
          ],
        }}
      />
      <section className="relative isolate overflow-hidden bg-ink">
        <SmartImage src={city.coverImageUrl} alt={city.name} fill sizes="100vw" className="-z-10 object-cover opacity-60" loading="eager" fetchPriority="high" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
        <Container className="pt-6 pb-28 text-white sm:pt-8">
          <div className="[&_a]:text-white/80 [&_span]:text-white/90 [&_svg]:text-white/60">
            <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Cities", href: "/cities" }, { name: city.name }]} />
          </div>
          <h1 className="mt-10 max-w-3xl text-3xl font-bold sm:text-5xl">The Best Kind of Stay in {city.name}</h1>
          {city.intro && <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">{city.intro}</p>}
          <p className="mt-2 text-sm text-white/70">
            {city.propertyCount} stays{city.state ? ` · ${city.state}` : ""}
          </p>
        </Container>
      </section>
      <div className="relative z-20 -mt-16">
        <Container>
          <StaySearchForm cities={meta.cities} initial={{ city: city.slug }} initialWhere={city.name} variant="bar" />
        </Container>
      </div>

      {areas.length > 0 && (
        <Container className="pt-8">
          <h2 className="text-sm font-semibold text-ink">Popular areas</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {areas.map((a) => (
              <li key={a.id}>
                <Link
                  href={searchHref({ city: city.slug, area: a.slug })}
                  title={a.description ?? undefined}
                  className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm text-ink-2 hover:border-brand hover:text-brand"
                >
                  <MapPin className="size-3.5" aria-hidden /> {a.name}
                  {a.isRecommended && <span className="text-xs text-brand">★</span>}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}

      {featured.length > 0 && (
        <Band tone={tone()}>
          <Container>
            <SectionHeading title={`Top stays in ${city.name}`} href={searchHref({ city: city.slug })} />
            <ScrollRow label={`Top stays in ${city.name}`}>
              {featured.map((p, i) => (
                <PropertyPosterCard key={p.id} p={p} eager={i < 2} className={rowItem.poster} />
              ))}
            </ScrollRow>
          </Container>
        </Band>
      )}

      {videos.length > 0 && (
        <Band tone={tone()}>
          <Container>
            <SectionHeading title={`See ${city.name} stays on video`} href={`/videos?city=${city.slug}`} />
            <ScrollRow label="Video tours">
              {videos.map((v) => (
                <VideoCard key={v.media.id} item={v} className={rowItem.video} />
              ))}
            </ScrollRow>
          </Container>
        </Band>
      )}

      {byType
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <Band key={g.type} tone={tone()}>
            <Container>
              <SectionHeading title={`${g.label} in ${city.name}`} subtitle={`${g.count} stays`} href={searchHref({ city: city.slug, type: [g.type] })} />
              <ScrollRow label={`${g.label} in ${city.name}`}>
                {g.items.map((p) => (
                  <PropertyPosterCard key={p.id} p={p} className={rowItem.poster} />
                ))}
              </ScrollRow>
            </Container>
          </Band>
        ))}

      {collections.length > 0 && (
        <Band tone={tone()}>
          <Container>
            <SectionHeading title={`Curated collections in ${city.name}`} href={`/collections?city=${city.slug}`} />
            <ScrollRow label="Collections">
              {collections.map((c) => (
                <CollectionTile key={c.id} c={c} className={rowItem.wide} />
              ))}
            </ScrollRow>
          </Container>
        </Band>
      )}

      {experiences.length > 0 && (
        <Band tone={tone()}>
          <Container>
            <SectionHeading title={`Things to do in ${city.name}`} href={`/experiences?city=${city.slug}`} />
            <ScrollRow label="Experiences">
              {experiences.map((e) => (
                <ExperienceCard key={e.id} e={e} className={rowItem.wide} />
              ))}
            </ScrollRow>
          </Container>
        </Band>
      )}

      {(city.travelInfo || city.foodGuide) && (
        <Band tone={tone()}>
          <Container className="grid gap-8 md:grid-cols-2">
            {city.travelInfo && (
              <div>
                <h2 className="text-xl font-bold text-ink">Getting around {city.name}</h2>
                <Prose text={city.travelInfo} className="mt-3" />
              </div>
            )}
            {city.foodGuide && (
              <div>
                <h2 className="text-xl font-bold text-ink">What to eat in {city.name}</h2>
                <Prose text={city.foodGuide} className="mt-3" />
              </div>
            )}
          </Container>
        </Band>
      )}
    </>
  );
}
