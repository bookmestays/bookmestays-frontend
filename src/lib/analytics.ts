// Fire-and-forget guest analytics (blueprint §19). Never throws, never blocks UI.
// Every event goes to our own backend (admin → Site analytics) and, when Google Analytics is
// configured (NEXT_PUBLIC_GA_ID), is mirrored to GA4 as well.
export type AnalyticsEvent =
  | "page_view"
  | "search_performed"
  | "destination_selected"
  | "property_viewed"
  | "video_played"
  | "video_completed"
  | "wishlist_added"
  | "room_selected"
  | "booking_started"
  | "payment_started"
  | "payment_failed"
  | "payment_completed"
  | "booking_error"
  | "booking_cancelled"
  | "experience_viewed"
  | "page_not_found"
  | "js_error";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const VISITOR_KEY = "bms_sid"; // long-lived browser id (kept under its original key so returning visitors stay recognised)
const SESSION_KEY = "bms_sess";
const SESSION_IDLE_MS = 30 * 60 * 1000;

type Utm = { source?: string; medium?: string; campaign?: string };
type Session = { id: string; last: number; ref?: string; utm?: Utm };

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function visitorId(): string | undefined {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = newId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

/** Where this visit came from: utm_* tags on the landing URL, else an external referrer. */
function landingAttribution(): Pick<Session, "ref" | "utm"> {
  const q = new URLSearchParams(window.location.search);
  const utm: Utm = {};
  const s = q.get("utm_source") ?? (q.get("gclid") ? "google" : q.get("fbclid") ? "facebook" : null);
  if (s) utm.source = s.slice(0, 120);
  const m = q.get("utm_medium") ?? (q.get("gclid") ? "cpc" : null);
  if (m) utm.medium = m.slice(0, 120);
  const c = q.get("utm_campaign");
  if (c) utm.campaign = c.slice(0, 200);
  let ref: string | undefined;
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : "";
    if (host && host !== window.location.hostname) ref = host;
  } catch {
    /* bad referrer */
  }
  return { ref, utm: utm.source ? utm : undefined };
}

/** Browsing session: ends after 30 min idle, or when the guest arrives via a new campaign link. */
function session(): Session | undefined {
  try {
    const now = Date.now();
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as Session | null;
    const landing = landingAttribution();
    const newCampaign = landing.utm?.source && landing.utm.source !== saved?.utm?.source;
    let s: Session;
    if (!saved || now - saved.last > SESSION_IDLE_MS || newCampaign) s = { id: newId(), last: now, ...landing };
    else s = { ...saved, last: now };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  } catch {
    return undefined;
  }
}

function toGa(name: AnalyticsEvent, props?: Record<string, unknown>) {
  const gtag = window.gtag;
  if (!gtag || name === "page_view") return; // GA4 records page views itself (enhanced measurement)
  gtag("event", name, props);
  if (name === "payment_completed" && props) {
    // Standard GA4 ecommerce event so revenue shows in GA's monetisation reports (amounts are paise)
    gtag("event", "purchase", {
      transaction_id: props.bookingCode,
      value: typeof props.amount === "number" ? props.amount / 100 : undefined,
      currency: "INR",
      items: props.propertyId ? [{ item_id: props.propertyId, item_category: "stay" }] : undefined,
    });
  }
}

export function track(name: AnalyticsEvent, props?: Record<string, unknown>) {
  try {
    if (typeof window === "undefined") return;
    const s = session();
    let tz: string | undefined;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      /* ignore */
    }
    const body = JSON.stringify({
      name,
      visitorId: visitorId(),
      sessionId: s?.id,
      path: window.location.pathname,
      ref: s?.ref,
      utm: s?.utm,
      tz,
      props,
    });
    try {
      toGa(name, props);
    } catch {
      /* ignore */
    }
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon("/api/public/analytics", new Blob([body], { type: "application/json" }));
      if (ok) return;
    }
    void fetch("/api/public/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "include",
    }).catch(() => {});
  } catch {
    // analytics must never break the page
  }
}
