"use client";

import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui";
import { track, type AnalyticsEvent } from "@/lib/analytics";
import { cn } from "@/lib/cn";

/** Fires an analytics event once on mount (e.g. property_viewed). */
export function TrackView({ event, props }: { event: AnalyticsEvent; props: Record<string, unknown> }) {
  const key = JSON.stringify(props);
  useEffect(() => {
    track(event, JSON.parse(key) as Record<string, unknown>);
  }, [event, key]);
  return null;
}

export function ShareButton({ title, className }: { title: string; className?: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) await navigator.share({ title, url });
          else {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard");
          }
        } catch {
          // user cancelled share
        }
      }}
      aria-label="Share this stay"
      className={cn("inline-flex size-10 items-center justify-center rounded-full border border-line bg-white hover:bg-surface-2", className)}
    >
      <Share2 className="size-[18px]" aria-hidden />
    </button>
  );
}

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "rooms", label: "Rooms" },
  { id: "amenities", label: "Amenities" },
  { id: "videos", label: "Videos" },
  { id: "location", label: "Location" },
  { id: "rules", label: "Policies" },
  { id: "reviews", label: "Reviews" },
];

/** Sticky in-page navigation for the property page. */
export function SectionNav({ available }: { available: string[] }) {
  const items = SECTIONS.filter((s) => available.includes(s.id));
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const els = items.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    const obs = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available.join(",")]);

  return (
    <nav aria-label="On this page" className="sticky top-0 z-20 -mx-4 border-b border-line bg-white/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <ul className="no-scrollbar flex gap-5 overflow-x-auto">
        {items.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "true" : undefined}
              className={cn(
                "inline-flex h-12 items-center border-b-2 text-sm font-medium transition-colors",
                active === s.id ? "border-brand text-brand" : "border-transparent text-ink-2 hover:text-ink",
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
