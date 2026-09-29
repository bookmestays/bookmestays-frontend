"use client";

import { api } from "@/lib/api";
import type { BookingDetail, PaymentOrder } from "@/lib/types";

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayFailure = { error?: { description?: string; reason?: string } };
type RazorpayInstance = { open: () => void; on: (evt: "payment.failed", cb: (r: RazorpayFailure) => void) => void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

let scriptPromise: Promise<RazorpayCtor> | null = null;

/** Loads https://checkout.razorpay.com/v1/checkout.js once. */
export function loadRazorpay(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  scriptPromise ??= new Promise<RazorpayCtor>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Razorpay unavailable")));
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export const isMockPayment = (o: PaymentOrder) => o.keyId === "MOCK";

export function verifyPayment(code: string, body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
  return api<BookingDetail>(`/bookings/${code}/verify-payment`, { method: "POST", body });
}

/** Dev-only mock payment (PaymentOrder.keyId === "MOCK"). */
export function simulateMockPayment(code: string, order: PaymentOrder) {
  return verifyPayment(code, {
    razorpayOrderId: order.orderId,
    razorpayPaymentId: `pay_mock_${Math.random().toString(36).slice(2, 12)}`,
    razorpaySignature: "MOCK",
  });
}

/**
 * Opens Razorpay Checkout for any order and verifies the result with `verify`. Resolves with verify's result,
 * or rejects with { dismissed: true } (user closed the window) / { failed: message }.
 */
export async function openRazorpayCheckout<T>(
  order: PaymentOrder,
  opts: { description: string; notes?: Record<string, string>; verify: (r: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) => Promise<T> },
): Promise<T> {
  const Razorpay = await loadRazorpay();
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const rzp = new Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: "BookMeStays",
      description: opts.description,
      prefill: order.prefill,
      notes: opts.notes,
      theme: { color: "#e8445a" },
      retry: { enabled: false },
      handler: (r: RazorpayResponse) => {
        settled = true;
        opts
          .verify({ razorpayOrderId: r.razorpay_order_id, razorpayPaymentId: r.razorpay_payment_id, razorpaySignature: r.razorpay_signature })
          .then(resolve)
          .catch((e) => reject({ failed: (e as Error).message || "We couldn't verify your payment. If money was debited, it will be confirmed or refunded automatically." }));
      },
      modal: {
        ondismiss: () => {
          if (!settled) reject({ dismissed: true });
        },
      },
    });
    rzp.on("payment.failed", (r) => {
      settled = true;
      reject({ failed: r.error?.description ?? "Payment failed. No money was charged — please try again." });
    });
    rzp.open();
  });
}

/** Opens Razorpay Checkout for a booking and confirms it (see openRazorpayCheckout for the rejection shape). */
export function payWithRazorpay(code: string, order: PaymentOrder, description: string): Promise<BookingDetail> {
  return openRazorpayCheckout(order, { description, notes: { bookingCode: code }, verify: (body) => verifyPayment(code, body) });
}
