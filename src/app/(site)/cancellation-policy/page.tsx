import Link from "next/link";
import type { Metadata } from "next";
import { StaticPage } from "@/components/site/static-page";

export const metadata: Metadata = { title: "Cancellation policy", alternates: { canonical: "/cancellation-policy" } };

export default function CancellationPolicyPage() {
  return (
    <StaticPage
      title="Cancellation policy"
      updated="September 2026"
      sections={[
        { title: "Policies vary by rate", body: <p>Each room rate carries its own cancellation policy, set by the property. It is shown next to the rate, again before payment, and in your confirmation. Common examples:</p> },
        { title: "Typical examples", body: <ul><li>Free cancellation until 72 hours before check-in, then 50% refund until 24 hours before.</li><li>Free cancellation until 7 days before check-in.</li><li>Non-refundable — lower price, no refund on cancellation.</li></ul> },
        { title: "How to cancel", body: <p>Open <Link href="/account/bookings">My bookings</Link>, choose the booking and select Cancel booking. You&apos;ll see the exact refund amount before confirming.</p> },
        { title: "No-shows", body: <p>If you don&apos;t arrive and haven&apos;t cancelled, the booking is treated as a no-show and is not refundable.</p> },
      ]}
    />
  );
}
