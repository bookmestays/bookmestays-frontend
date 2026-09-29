import type { Metadata } from "next";
import { HeroCarousel } from "@/components/site/home/hero-carousel";
import { HomeSections, WhyBookMeStays } from "@/components/site/home/home-sections";
import { Container, JsonLd } from "@/components/site/primitives";
import { StaySearchForm } from "@/components/site/search/stay-search-form";
import { getSiteMeta, keepStaleOnError, loadPublic, SITE_URL } from "@/lib/public-data";
import type { HomePayload } from "@/lib/types";

export const metadata: Metadata = {
  title: { absolute: "BookMeStays — Your perfect stay. Simply Booked." },
  description:
    "Discover hotels, villas, farmhouses, homestays and heritage stays across India with real video walkthroughs. See it before you book it.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "BookMeStays — Your perfect stay. Simply Booked.",
    description: "See the property before you book it. Video-first stays across India.",
    url: "/",
    siteName: "BookMeStays",
    type: "website",
  },
};

export default async function HomePage() {
  const [home, meta] = await Promise.all([
    loadPublic<HomePayload>("/public/home", { revalidate: 60, tags: ["home"] }).then(keepStaleOnError),
    getSiteMeta(),
  ]);
  const banners = home.data?.banners ?? [];
  const sections = home.data?.sections ?? [];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "BookMeStays",
          url: SITE_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <HeroCarousel banners={banners} />
      <div className="relative z-20 -mt-20 lg:-mt-14">
        <Container>
          <StaySearchForm cities={meta.cities} variant="hero" />
        </Container>
      </div>

      {home.error && (
        <Container className="pt-8">
          <div role="status" className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink-2">
            We&apos;re having trouble loading stays right now. You can still search above, or refresh the page in a moment.
          </div>
        </Container>
      )}

      <div className="pt-4">
        {sections.length > 0 ? <HomeSections sections={sections} /> : <WhyBookMeStays tone="white" />}
      </div>
    </>
  );
}
