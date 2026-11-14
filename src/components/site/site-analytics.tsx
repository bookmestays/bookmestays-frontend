"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const MAX_ERRORS_PER_PAGE = 5;

/**
 * Guest-site analytics: loads Google Analytics 4 (when NEXT_PUBLIC_GA_ID is set), records a
 * first-party page_view on every route change, and reports uncaught JS errors so the admin
 * "Site analytics" page can surface problems guests run into.
 */
export function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    track("page_view");
  }, [pathname]);

  useEffect(() => {
    let sent = 0;
    const seen = new Set<string>();
    const report = (message: string, extra: Record<string, unknown>) => {
      const key = message.slice(0, 200);
      if (!key || seen.has(key) || sent >= MAX_ERRORS_PER_PAGE) return;
      // Noise from browser extensions / cross-origin scripts we can't act on
      if (/^Script error\.?$/i.test(key) || /ResizeObserver loop/i.test(key)) return;
      seen.add(key);
      sent++;
      track("js_error", { message: key, ...extra });
    };
    const onError = (e: ErrorEvent) => report(e.message || String(e.error ?? ""), { source: e.filename?.slice(0, 200), line: e.lineno });
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string } | undefined;
      report(r?.message ?? String(e.reason ?? "Unhandled promise rejection"), { kind: "promise" });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (!GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
