import Link from "next/link";
import type { Metadata } from "next";
import { StaticPage } from "@/components/site/static-page";
import { getSiteMeta } from "@/lib/public-data";

export const metadata: Metadata = { title: "Help Center", description: "Answers about booking, payments, cancellations and refunds on BookMeStays.", alternates: { canonical: "/help" } };

const FAQ: { q: string; a: string }[] = [
  { q: "How do I book a stay?", a: "Open a property, choose your dates and guests, select a room and rate, then sign in with a one-time code and pay securely. You'll get an instant confirmation by email." },
  { q: "Do I need an account to book?", a: "Yes — a quick sign-in with a one-time code on your phone or email. It lets you manage, cancel and review your bookings." },
  { q: "Which payment methods are accepted?", a: "UPI, credit and debit cards, net banking and popular wallets via Razorpay. All bookings are prepaid." },
  { q: "Are taxes included in the price?", a: "Nightly prices on listings exclude GST. Your full price including taxes is shown before you pay." },
  { q: "How do I cancel?", a: "Go to My bookings, open the booking and choose Cancel booking. You'll see the exact refund before you confirm." },
  { q: "When will I get my refund?", a: "Eligible refunds are initiated immediately and usually reach your original payment method in 5–7 working days." },
  { q: "My payment failed but money was debited.", a: "Don't worry — if a payment isn't confirmed, it's automatically refunded by the bank/payment provider, usually within 5–7 working days. Contact us with the booking reference if you need help." },
];

export default async function HelpPage() {
  const { support } = await getSiteMeta();
  return (
    <StaticPage
      title="Help Center"
      subtitle="Quick answers to common questions."
      sections={[
        {
          id: "faq",
          title: "Frequently asked questions",
          body: (
            <div className="space-y-2">
              {FAQ.map((f) => (
                <details key={f.q} className="rounded-lg border border-line bg-white p-3">
                  <summary className="cursor-pointer font-medium text-ink">{f.q}</summary>
                  <p className="mt-2">{f.a}</p>
                </details>
              ))}
            </div>
          ),
        },
        {
          id: "booking-support",
          title: "Booking support",
          body: (
            <p>
              Need help with a booking? Contact us at <a href={`mailto:${support.email || "support@bookmestays.com"}`}>{support.email || "support@bookmestays.com"}</a>
              {support.phone ? (
                <>
                  {" "}
                  or call <a href={`tel:${support.phone}`}>{support.phone}</a>
                </>
              ) : null}{" "}
              with your booking reference.
            </p>
          ),
        },
        { title: "Policies", body: <ul><li><Link href="/cancellation-policy">Cancellation policy</Link></li><li><Link href="/refund-policy">Refund policy</Link></li><li><Link href="/terms">Terms &amp; conditions</Link></li><li><Link href="/privacy">Privacy policy</Link></li></ul> },
      ]}
    />
  );
}
