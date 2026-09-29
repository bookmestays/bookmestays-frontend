import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutFlow } from "@/components/site/booking/checkout-flow";
import { decodeSelections } from "@/components/site/booking/selections";
import { Container } from "@/components/site/primitives";
import { buttonClass, EmptyState, ErrorState } from "@/components/ui";
import { loadPublic } from "@/lib/public-data";
import { parseSearchParams } from "@/lib/search-params";
import type { PropertyDetail } from "@/lib/types";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage(props: PageProps<"/checkout">) {
  const sp = await props.searchParams;
  const slug = typeof sp.property === "string" ? sp.property : undefined;
  const f = parseSearchParams(sp);
  const selections = decodeSelections(typeof sp.sel === "string" ? sp.sel : undefined);

  if (!slug || !f.checkIn || !f.checkOut || selections.length === 0) {
    return (
      <Container className="py-16">
        <EmptyState
          icon={<ShoppingBag />}
          title="Your booking selection is missing"
          description="Choose your dates and a room on a property page to start a booking."
          action={
            <Link href="/search" className={buttonClass("primary")}>
              Find a stay
            </Link>
          }
        />
      </Container>
    );
  }

  const res = await loadPublic<PropertyDetail>(`/public/properties/${encodeURIComponent(slug)}`, { revalidate: 60, tags: [`property:${slug}`] });
  if (res.error || !res.data) {
    return (
      <Container className="py-16">
        {res.error ? (
          <ErrorState message="We couldn't load this property right now. Please refresh the page to try again." />
        ) : (
          <EmptyState title="This property is no longer available" description="It may have been removed or is temporarily not accepting bookings." action={<Link href="/search" className={buttonClass("primary")}>Find another stay</Link>} />
        )}
      </Container>
    );
  }
  const p = res.data;

  return (
    <div className="bg-surface-2">
      <Container className="py-6 sm:py-8">
        <h1 className="mb-5 text-2xl font-bold text-ink">Complete your booking</h1>
        <CheckoutFlow
          property={{
            id: p.id,
            slug: p.slug,
            name: p.name,
            location: [p.areaName, p.cityName].filter(Boolean).join(", "),
            coverImageUrl: p.coverImageUrl,
            checkInTime: p.checkInTime,
            checkOutTime: p.checkOutTime,
            cancellationPolicy: p.cancellationPolicy,
          }}
          checkIn={f.checkIn}
          checkOut={f.checkOut}
          adults={f.adults}
          childCount={f.children}
          selections={selections}
        />
      </Container>
    </div>
  );
}
