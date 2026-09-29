"use client";

import { useSyncExternalStore } from "react";

function subscribeMedia(query: string) {
  return (cb: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  };
}

/** SSR-safe media query hook (server snapshot = `serverValue`). */
export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

type NetworkInformation = { saveData?: boolean; addEventListener?: (t: string, cb: () => void) => void; removeEventListener?: (t: string, cb: () => void) => void };
const connection = () => (typeof navigator !== "undefined" ? (navigator as Navigator & { connection?: NetworkInformation }).connection : undefined);

function subscribeSaveData(cb: () => void) {
  const c = connection();
  c?.addEventListener?.("change", cb);
  return () => c?.removeEventListener?.("change", cb);
}

/**
 * Whether decorative autoplay video is allowed: false during SSR/hydration,
 * when the user prefers reduced motion, or has Data Saver on.
 */
export function useAutoplayAllowed() {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", true);
  const saveData = useSyncExternalStore(subscribeSaveData, () => !!connection()?.saveData, () => true);
  return !reduced && !saveData;
}

/** True on devices with a real hover-capable pointer (desktop). */
export const useCanHover = () => useMediaQuery("(hover: hover) and (pointer: fine)", false);

/** Hydration flag without setState-in-effect. */
export const useIsClient = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
