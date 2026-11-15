// Meta Pixel conversion events for the booking funnel. The base pixel (init + PageView) is loaded in
// app/layout.tsx; these helpers are fire-and-forget and never throw, so tracking can't break checkout.
import type { BookingDetail } from "./types";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]) {
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") window.fbq(...args);
  } catch {
    /* tracking must never break the page */
  }
}

/** Remembers (in this browser) that an event was already sent for a booking, so it fires once. */
function once(key: string): boolean {
  try {
    const k = `bms_px_${key}`;
    if (localStorage.getItem(k)) return false;
    localStorage.setItem(k, String(Date.now()));
  } catch {
    /* storage blocked: still send; Meta de-duplicates on eventID */
  }
  return true;
}

/** Guest pressed "Reserve" with dates, guests and available rooms selected and is heading to checkout. */
export function pixelInitiateCheckout() {
  fbq("track", "InitiateCheckout");
}

/** Guest submitted the payment step (validated details, booking created) and Razorpay is about to open. */
export function pixelAddPaymentInfo(bookingCode: string) {
  if (!once(`api_${bookingCode}`)) return;
  fbq("track", "AddPaymentInfo", {}, { eventID: `api_${bookingCode}` });
}

const PAID: BookingDetail["status"][] = ["CONFIRMED", "CHECKED_IN", "COMPLETED"];

/**
 * Call only with the booking returned by the backend after it verified the Razorpay payment.
 * Sends nothing for failed / pending / cancelled bookings, and at most once per booking
 * (localStorage guard here + eventID so Meta drops any repeat from another tab or device).
 */
export function pixelPurchase(b: Pick<BookingDetail, "code" | "status" | "totalAmount">) {
  if (!PAID.includes(b.status) || !(b.totalAmount > 0)) return;
  if (!once(`purchase_${b.code}`)) return;
  // totalAmount is in paise; Meta expects rupees.
  fbq("track", "Purchase", { value: b.totalAmount / 100, currency: "INR" }, { eventID: `purchase_${b.code}` });
}
