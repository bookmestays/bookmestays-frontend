"use client";

import { useEffect } from "react";

/**
 * Warns before leaving the page with unsaved changes: browser unload/reload and in-app link clicks
 * (App Router has no route-change blocking API, so anchor clicks are intercepted in the capture phase).
 */
export function useUnsavedChanges(dirty: boolean, message = "You have unsaved changes. Leave without saving?") {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, message]);
}

/** Cheap structural equality for form dirty-checking. */
export const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
