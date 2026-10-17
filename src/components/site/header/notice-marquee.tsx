import type { SiteNotice } from "@/lib/types";

// Seconds for one full loop — higher = slower scroll.
const DURATION: Record<SiteNotice["speed"], string> = {
  slow: "42s",
  normal: "26s",
  fast: "15s",
};

// The track is duplicated and scrolled -50%, so an even copy count loops seamlessly.
const COPIES = 4;

/**
 * Admin-managed announcement ticker shown directly below the site header on
 * every public page. Pure-CSS marquee (so it can stay a server component):
 * scrolls continuously, pauses on hover, and freezes for reduced-motion users.
 */
export function NoticeMarquee({ notice }: { notice: SiteNotice }) {
  const text = notice?.text?.trim();
  if (!notice?.enabled || !text) return null;
  const duration = DURATION[notice.speed] ?? DURATION.normal;

  return (
    <aside aria-label="Site announcement" className="notice-marquee border-b border-brand/20 bg-brand text-white">
      <div className="relative flex overflow-hidden py-2">
        <div className="notice-marquee-track flex shrink-0 items-center whitespace-nowrap text-sm font-medium" style={{ animationDuration: duration }}>
          {Array.from({ length: COPIES }).map((_, i) => (
            <span key={i} className="flex items-center" aria-hidden={i > 0}>
              <span className="px-6">{text}</span>
              <span className="text-white/50" aria-hidden>
                •
              </span>
            </span>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes notice-marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .notice-marquee-track { animation: notice-marquee-scroll linear infinite; }
        .notice-marquee:hover .notice-marquee-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .notice-marquee-track { animation: none; } }
      `}</style>
    </aside>
  );
}
