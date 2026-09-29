// Fire-and-forget guest analytics (blueprint §19). Never throws, never blocks UI.
export type AnalyticsEvent =
  | "search_performed"
  | "destination_selected"
  | "property_viewed"
  | "video_played"
  | "video_completed"
  | "wishlist_added"
  | "room_selected"
  | "booking_started"
  | "payment_completed"
  | "booking_cancelled"
  | "experience_viewed";

const SESSION_KEY = "bms_sid";

function sessionId(): string | undefined {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

export function track(name: AnalyticsEvent, props?: Record<string, unknown>) {
  try {
    if (typeof window === "undefined") return;
    const body = JSON.stringify({ name, sessionId: sessionId(), props: { ...props, path: window.location.pathname } });
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
