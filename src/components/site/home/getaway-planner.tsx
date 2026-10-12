import { ArrowRight, Briefcase, CreditCard, Heart, PartyPopper, PlayCircle, ReceiptIndianRupee, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { searchHref } from "@/lib/search-params";
import type { TravelTag } from "@/lib/types";
import { SmartImage } from "../media/smart-image";
import { Container } from "../primitives";

// "Mood + who" quick start between the hero search and the first home section:
// one tap lands on search results with a matching filter already applied.

const img = (id: string) => `https://images.unsplash.com/${id}?w=600&q=70`;

const MOODS: { label: string; blurb: string; href: string; image: string }[] = [
  { label: "Pool & chill", blurb: "Villas with private pools", href: searchHref({ amenities: ["private_pool"] }), image: img("photo-1512917774080-9991f1c4c750") },
  { label: "Royal heritage", blurb: "Havelis & palaces", href: searchHref({ type: ["HERITAGE"] }), image: img("photo-1477587458883-47145ed94245") },
  { label: "Beach vibes", blurb: "Sun, sand & Goa", href: searchHref({ city: "goa" }), image: img("photo-1614082242765-7c98ca0f3df3") },
  { label: "Mountain air", blurb: "Snow peaks of Manali", href: searchHref({ city: "manali" }), image: img("photo-1597167231350-d057a45dc868") },
  { label: "Back to nature", blurb: "Farm stays & open skies", href: searchHref({ type: ["FARMHOUSE"] }), image: img("photo-1571524188026-cc1d649962ea") },
  { label: "Soul & spirit", blurb: "Riverside Rishikesh", href: searchHref({ city: "rishikesh" }), image: img("photo-1712510817140-917938f92e5b") },
];

const WHO: { tag: TravelTag; label: string; blurb: string; Icon: ComponentType<{ className?: string }> }[] = [
  { tag: "COUPLES", label: "Couples", blurb: "Romantic hideaways", Icon: Heart },
  { tag: "FAMILY", label: "Family", blurb: "Space for everyone", Icon: Users },
  { tag: "FRIENDS", label: "Friends", blurb: "Villas & good times", Icon: PartyPopper },
  { tag: "CORPORATE", label: "Work trips", blurb: "Wi-Fi & workspaces", Icon: Briefcase },
];

const TRUST = [
  { Icon: PlayCircle, label: "Video walkthroughs" },
  { Icon: ReceiptIndianRupee, label: "All-in prices with GST" },
  { Icon: CreditCard, label: "Secure Razorpay payments" },
  { Icon: ShieldCheck, label: "Clear cancellation terms" },
];

export function GetawayPlanner() {
  return (
    <section aria-labelledby="getaway-title" className="pt-10 pb-4 sm:pt-12">
      <Container>
        <div className="rounded-3xl border border-line bg-gradient-to-b from-brand-soft/70 to-white p-5 sm:p-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">Plan your getaway</p>
            <h2 id="getaway-title" className="mt-1 text-xl font-bold text-ink sm:text-2xl">
              Not sure where to start? Pick a <span className="text-accent-hover">mood</span> or <span className="text-accent-hover">who&apos;s coming</span>.
            </h2>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-ink-2">What&apos;s your mood?</h3>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {MOODS.map((m) => (
                    <li key={m.label}>
                      <Link
                        href={m.href}
                        className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-surface-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
                      >
                        <SmartImage
                          src={m.image}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                        <span className="absolute inset-x-0 bottom-0 p-3 text-white">
                          <span className="flex items-center gap-1 text-sm font-bold sm:text-base">
                            {m.label}
                            <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
                          </span>
                          <span className="block truncate text-xs text-white/85">{m.blurb}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col">
                <h3 className="mb-3 text-sm font-semibold text-ink-2">Who&apos;s travelling?</h3>
                <ul className="grid flex-1 grid-cols-2 grid-rows-2 gap-3">
                  {WHO.map(({ tag, label, blurb, Icon }) => (
                    <li key={tag}>
                      <Link
                        href={searchHref({ tags: [tag] })}
                        className="group flex h-full flex-col justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                      >
                        <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                          <Icon className="size-5" />
                        </span>
                        <span>
                          <span className="flex items-center gap-1 text-sm font-semibold text-ink">
                            {label}
                            <ArrowRight className="size-3.5 text-accent-hover opacity-0 transition group-hover:opacity-100" aria-hidden />
                          </span>
                          <span className="block text-xs text-muted">{blurb}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line/80 pt-4 text-xs font-medium text-ink-2 sm:flex sm:flex-wrap sm:justify-between">
              {TRUST.map(({ Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-success" aria-hidden /> {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
