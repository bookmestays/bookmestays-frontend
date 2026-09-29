"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Horizontal, snap-scrolling row of cards (intentional carousel). Children should be
 * fixed-width items (see `itemClass`). Arrow buttons appear on desktop when there is overflow.
 */
export function ScrollRow({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div className={cn("group/row relative", className)}>
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 focus-visible:outline-none sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0"
      >
        {children}
      </div>
      {!edges.start && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scroll(-1)}
          className="absolute top-1/3 -left-4 hidden size-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-md hover:bg-surface-2 lg:flex"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      )}
      {!edges.end && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scroll(1)}
          className="absolute top-1/3 -right-4 hidden size-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-md hover:bg-surface-2 lg:flex"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      )}
    </div>
  );
}
