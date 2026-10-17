"use client";

import { useEffect, useRef, useState } from "react";
import type { CityLite } from "@/lib/types";

const TYPE_MS = 55; // delay per character while typing
const DELETE_MS = 28; // delay per character while deleting
const HOLD_MS = 1600; // pause once a phrase is fully typed
const GAP_MS = 500; // pause on the next phrase's first letter, before typing the rest

/**
 * Self-typing placeholder: shows a phrase, holds, deletes it, then types the
 * next phrase — looping forever. Returns the text to feed straight into an
 * input's `placeholder` (do NOT add a static fallback — the first phrase is
 * shown fully on the first paint, so there's no empty/flashing state).
 *
 * Pass `active: false` (e.g. once the user has typed something, so the
 * placeholder is hidden anyway) to freeze the animation, and it honours
 * `prefers-reduced-motion` by showing a single static phrase instead.
 */
export function useTypedPlaceholder(phrases: string[], active = true): string {
  // Start on the first phrase, fully typed — this is what SSR / no-JS renders too.
  const [text, setText] = useState(() => phrases[0] ?? "");
  // Keep the latest phrases without retriggering the effect on every render.
  const phrasesRef = useRef(phrases);
  phrasesRef.current = phrases;
  const key = phrases.join("\u0001");

  useEffect(() => {
    const list = phrasesRef.current;
    if (!active || list.length === 0) return;

    // Always begin from the first phrase shown in full.
    setText(list[0]);

    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return;

    let phrase = 0;
    let char = list[0].length;
    let deleting = true; // we're already showing a full phrase, so delete it first
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (deleting) {
        char -= 1;
        setText(list[phrase].slice(0, Math.max(char, 1))); // keep ≥1 char so it never looks like the empty default
        if (char <= 1) {
          deleting = false;
          phrase = (phrase + 1) % list.length;
          char = 1;
          setText(list[phrase].slice(0, 1));
          timer = setTimeout(tick, GAP_MS);
          return;
        }
        timer = setTimeout(tick, DELETE_MS);
      } else {
        char += 1;
        setText(list[phrase].slice(0, char));
        if (char >= list[phrase].length) {
          deleting = true;
          timer = setTimeout(tick, HOLD_MS);
          return;
        }
        timer = setTimeout(tick, TYPE_MS);
      }
    };

    // Hold the first (already fully shown) phrase before it starts deleting.
    timer = setTimeout(tick, HOLD_MS);
    return () => clearTimeout(timer);
  }, [active, key]);

  return text;
}

/**
 * Builds a rotating set of search prompts from real catalog data (property
 * types + the site's cities) so the animated placeholder always reflects what
 * guests can actually find.
 */
export function buildSearchPhrases(cities: CityLite[] = []): string[] {
  const types = ["Hotels", "Villas", "Farmhouses", "Homestays", "Heritage stays"];
  const names = cities.map((c) => c.name).filter(Boolean);
  const phrases: string[] = [];

  // Interleave "<type> in <city>" using whatever cities we have.
  names.slice(0, 6).forEach((city, i) => {
    phrases.push(`${types[i % types.length]} in ${city}`);
  });

  // Evergreen prompts that don't depend on any particular city.
  phrases.push("Villas with a private pool", "Weekend getaways near you", "Beachfront stays", "Heritage stays & homestays");

  // De-duplicate while preserving order; guarantee a non-empty result.
  const seen = new Set<string>();
  const unique = phrases.filter((p) => (seen.has(p) ? false : seen.add(p)));
  return unique.length > 0 ? unique : ["Search stays, cities and landmarks"];
}
