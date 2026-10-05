import Link from "next/link";
import type { Metadata } from "next";
import { StaticPage } from "@/components/site/static-page";

export const metadata: Metadata = { title: "Terms & conditions", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <StaticPage
      title="Terms & conditions"
      updated="September 2026"
      subtitle="Please read these terms carefully before using BookMeStays."
      sections={[
        { title: "1. About these terms", body: <p>These terms govern your use of the BookMeStays website and your bookings made through it. By using the site or making a booking you agree to them. (Placeholder copy — final legal text to be provided.)</p> },
        { title: "2. Bookings", body: <p>BookMeStays acts as an intermediary between you and the property. A booking is confirmed only after full payment is received and you receive a confirmation with a booking reference. Room holds last 15 minutes during checkout.</p> },
        { title: "3. Prices and payment", body: <p>All prices are in Indian Rupees. Taxes are shown before payment. Bookings are prepaid through our payment partner; we never store your card details.</p> },
        { title: "4. Cancellations and refunds", body: <p>Each rate has its own cancellation policy, shown before you pay and in your confirmation. See our <Link href="/cancellation-policy">Cancellation policy</Link> and <Link href="/refund-policy">Refund policy</Link>.</p> },
        { title: "5. Your responsibilities", body: <ul><li>Provide accurate guest details.</li><li>Carry valid photo ID for all adult guests at check-in.</li><li>Follow the property&apos;s house rules.</li></ul> },
        { title: "6. Liability", body: <p>Properties are responsible for the services they provide. BookMeStays is not liable for events outside its reasonable control, to the extent permitted by law.</p> },
        { title: "7. Contact", body: <p>Questions? Write to <a href="mailto:bookmestaysupport@gmail.com">bookmestaysupport@gmail.com</a>.</p> },
      ]}
    />
  );
}
