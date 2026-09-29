import { ClipboardList, Compass, MapPin, MousePointerClick, PlayCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { searchHref } from "@/lib/search-params";
import type { HomeSection } from "@/lib/types";
import { ExperienceCard } from "../cards/experience-card";
import { PropertyPosterCard } from "../cards/property-card";
import { CityTile, CollectionTile, PropertyTypeTile } from "../cards/tiles";
import { VideoCard } from "../cards/video-card";
import { SmartImage } from "../media/smart-image";
import { Band, Container, SectionHeading } from "../primitives";
import { rowItem } from "../constants";
import { ScrollRow } from "../scroll-row";

/** Renders home sections in the order returned by GET /public/home. */
export function HomeSections({ sections }: { sections: HomeSection[] }) {
  let bandIndex = 0;
  return (
    <>
      {sections.map((s) => {
        const hasItems = s.type === "WHY_BOOKMESTAYS" || s.type === "CITY_SPOTLIGHT" ? true : s.items.length > 0;
        if (!hasItems) return null;
        const tone = bandIndex++ % 2 === 0 ? "white" : "grey";
        return <HomeSectionView key={s.id} section={s} tone={tone} />;
      })}
    </>
  );
}

function HomeSectionView({ section: s, tone }: { section: HomeSection; tone: "white" | "grey" }) {
  switch (s.type) {
    case "RECOMMENDED":
    case "FEATURED":
      return (
        <Band tone={tone}>
          <Container>
            <SectionHeading title={s.title} subtitle={s.subtitle} href={searchHref({ sort: s.type === "FEATURED" ? "rating" : "recommended" })} />
            <ScrollRow label={s.title}>
              {s.items.map((p) => (
                <PropertyPosterCard key={p.id} p={p} className={rowItem.poster} />
              ))}
            </ScrollRow>
          </Container>
        </Band>
      );
    case "PROPERTY_TYPES":
      return (
        <Band tone={tone}>
          <Container>
            <SectionHeading title={s.title} subtitle={s.subtitle} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              {s.items.map((t) => (
                <PropertyTypeTile key={t.type} item={t} />
              ))}
            </div>
          </Container>
        </Band>
      );
    case "VIDEO_DISCOVERY":
      return (
        <Band tone={tone}>
          <Container>
            <SectionHeading title={s.title} subtitle={s.subtitle ?? "Hover (or scroll) to preview — tap to open the stay."} href="/videos" />
            <ScrollRow label={s.title}>
              {s.items.map((it) => (
                <VideoCard key={it.media.id} item={it} className={rowItem.video} />
              ))}
            </ScrollRow>
          </Container>
        </Band>
      );
    case "EXPERIENCES":
      return (
        <Band tone={tone}>
          <Container>
            <SectionHeading title={s.title} subtitle={s.subtitle} href="/experiences" />
            <ScrollRow label={s.title}>
              {s.items.map((e) => (
                <ExperienceCard key={e.id} e={e} className={rowItem.wide} />
              ))}
            </ScrollRow>
          </Container>
        </Band>
      );
    case "CITIES":
      return (
        <Band tone={tone}>
          <Container>
            <SectionHeading title={s.title} subtitle={s.subtitle} href="/cities" />
            <ScrollRow label={s.title}>
              {s.items.map((c) => (
                <CityTile key={c.id} c={c} className={rowItem.tile} />
              ))}
            </ScrollRow>
          </Container>
        </Band>
      );
    case "COLLECTIONS":
      return (
        <Band tone={tone}>
          <Container>
            <SectionHeading title={s.title} subtitle={s.subtitle} href="/collections" />
            <ScrollRow label={s.title}>
              {s.items.map((c) => (
                <CollectionTile key={c.id} c={c} className={rowItem.wide} />
              ))}
            </ScrollRow>
          </Container>
        </Band>
      );
    case "CITY_SPOTLIGHT":
      return s.city ? <CitySpotlight section={s} tone={tone} /> : null;
    case "WHY_BOOKMESTAYS":
      return <WhyBookMeStays title={s.title} subtitle={s.subtitle} tone={tone} />;
    default:
      return null;
  }
}

function CitySpotlight({ section: s, tone }: { section: Extract<HomeSection, { type: "CITY_SPOTLIGHT" }>; tone: "white" | "grey" }) {
  const city = s.city!;
  return (
    <Band tone={tone}>
      <Container>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
          <div className="relative min-h-72 overflow-hidden rounded-2xl bg-ink text-white">
            <SmartImage src={city.coverImageUrl} alt={city.name} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
            <div className="relative flex h-full flex-col justify-end gap-3 p-6">
              <p className="text-xs font-semibold tracking-wide text-white/75 uppercase">City spotlight</p>
              <h2 className="text-2xl font-bold sm:text-3xl">{s.title || `The Best Kind of Stay in ${city.name}`}</h2>
              {(s.subtitle || city.intro) && <p className="line-clamp-3 text-sm text-white/85">{s.subtitle ?? city.intro}</p>}
              {s.areas.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label={`Popular areas in ${city.name}`}>
                  {s.areas.slice(0, 6).map((a) => (
                    <li key={a.id}>
                      <Link
                        href={searchHref({ city: city.slug, area: a.slug })}
                        className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur hover:bg-white/25"
                      >
                        <MapPin className="size-3" aria-hidden /> {a.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link href={`/cities/${city.slug}`} className="mt-1 inline-flex h-10 w-fit items-center rounded-lg bg-white px-4 text-sm font-semibold text-ink hover:bg-white/90">
                Explore {city.name}
              </Link>
            </div>
          </div>
          <div className="min-w-0">
            <SectionHeading title={`Stays in ${city.name}`} href={searchHref({ city: city.slug })} as="h3" />
            <ScrollRow label={`Stays in ${city.name}`}>
              {s.items.map((p) => (
                <PropertyPosterCard key={p.id} p={p} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[calc((100%-2rem)/3)]" />
              ))}
            </ScrollRow>
            {s.experiences.length > 0 && (
              <div className="mt-6">
                <SectionHeading title={`Things to do in ${city.name}`} href={`/experiences?city=${city.slug}`} as="h3" />
                <ScrollRow label={`Experiences in ${city.name}`}>
                  {s.experiences.map((e) => (
                    <ExperienceCard key={e.id} e={e} className="w-[70%] shrink-0 snap-start sm:w-[40%] lg:w-[calc((100%-2rem)/3)]" />
                  ))}
                </ScrollRow>
              </div>
            )}
          </div>
        </div>
      </Container>
    </Band>
  );
}

const WHY = [
  { Icon: PlayCircle, title: "See the property before you book", body: "Real video walkthroughs of rooms, pools and surroundings — no surprises at check-in." },
  { Icon: ClipboardList, title: "Clear property information", body: "Room sizes, bed types, inclusions, rules and cancellation terms, upfront." },
  { Icon: MousePointerClick, title: "Simple booking journey", body: "Dates, guests, room — and a transparent price with taxes before you pay." },
  { Icon: Compass, title: "Curated discovery", body: "Handpicked hotels, villas, farmhouses, homestays and heritage stays." },
  { Icon: Sparkles, title: "Stay + relevant experiences", body: "Pair your stay with local experiences, food and things to do nearby." },
];

export function WhyBookMeStays({ title, subtitle, tone = "grey" }: { title?: string; subtitle?: string | null; tone?: "white" | "grey" }) {
  return (
    <Band tone={tone}>
      <Container>
        <SectionHeading title={title || "Why BookMeStays"} subtitle={subtitle ?? "Simple, visual and trustworthy — the way booking a stay should be."} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {WHY.map(({ Icon, title: t, body }) => (
            <li key={t} className="rounded-2xl border border-line bg-white p-5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">{t}</h3>
              <p className="mt-1.5 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </Band>
  );
}
