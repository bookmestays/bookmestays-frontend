import type { Metadata } from "next";
import { StaticPage } from "@/components/site/static-page";

export const metadata: Metadata = { title: "Refund policy", alternates: { canonical: "/refund-policy" } };

export default function RefundPolicyPage() {
  return (
    <StaticPage
      title="Refund policy"
      updated="September 2026"
      sections={[
        { title: "Eligible refunds", body: <p>If you cancel within the free-cancellation window of your rate, you receive the refund shown at cancellation time. Non-refundable rates are not eligible for refunds.</p> },
        { title: "How refunds are paid", body: <p>Refunds are made to the original payment method. They are initiated immediately and typically reflect within 5–7 working days depending on your bank.</p> },
        { title: "Failed or duplicate payments", body: <p>If your payment was debited but the booking wasn&apos;t confirmed, the amount is automatically refunded. Contact <a href="mailto:support@bookmestays.com">support@bookmestays.com</a> if you don&apos;t see it within 7 working days.</p> },
        { title: "Property-initiated cancellations", body: <p>If a property cancels your confirmed booking, you receive a full refund and our team will help you find an alternative stay.</p> },
      ]}
    />
  );
}
