"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import type { ExperienceCard as ExperienceCardDTO, PropertyCard } from "@/lib/types";
import { ExperienceCard } from "../cards/experience-card";
import { PropertyPosterCard } from "../cards/property-card";

type WishlistPayload = { properties: PropertyCard[]; experiences: ExperienceCardDTO[] };

export function WishlistView() {
  const [attempt, setAttempt] = useState(0);
  const [res, setRes] = useState<{ attempt: number; data: WishlistPayload | null; error: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<WishlistPayload>("/wishlist")
      .then((data) => !cancelled && setRes({ attempt, data, error: false }))
      .catch(() => !cancelled && setRes({ attempt, data: null, error: true }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (!res || (res.attempt !== attempt && !res.data)) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (res.error) return <ErrorState message="We couldn't load your wishlist." onRetry={() => setAttempt((a) => a + 1)} />;

  const properties = res.data?.properties ?? [];
  const experiences = res.data?.experiences ?? [];

  if (properties.length === 0 && experiences.length === 0) {
    return (
      <EmptyState
        icon={<Heart />}
        title="Your wishlist is empty"
        description="Tap the heart on any stay or experience to save it here for later."
        action={
          <Link href="/search" className={buttonClass("primary")}>
            Explore stays
          </Link>
        }
        className="rounded-xl border border-dashed border-line"
      />
    );
  }

  return (
    <div className="space-y-8">
      {properties.length > 0 && (
        <section aria-labelledby="wl-stays">
          <h2 id="wl-stays" className="mb-3 text-lg font-semibold text-ink">
            Stays ({properties.length})
          </h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {properties.map((p) => (
              <li key={p.id}>
                <PropertyPosterCard p={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {experiences.length > 0 && (
        <section aria-labelledby="wl-exp">
          <h2 id="wl-exp" className="mb-3 text-lg font-semibold text-ink">
            Experiences ({experiences.length})
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {experiences.map((e) => (
              <li key={e.id}>
                <ExperienceCard e={e} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
