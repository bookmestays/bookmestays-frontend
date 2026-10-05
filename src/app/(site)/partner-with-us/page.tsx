import Link from "next/link";
import type { Metadata } from "next";
import { StaticPage } from "@/components/site/static-page";

export const metadata: Metadata = { title: "Partner with us", description: "List your hotel, villa, farmhouse, homestay or heritage property on BookMeStays.", alternates: { canonical: "/partner-with-us" } };

export default function PartnerPage() {
  return (
    <StaticPage
      title="Partner with BookMeStays"
      subtitle="Show guests exactly what they'll get — and get bookings from travellers who already know they love your place."
      sections={[
        { title: "Why list with us", body: <ul><li>Video-first listings that set honest expectations and reduce cancellations.</li><li>Prepaid bookings with transparent commission and scheduled settlements.</li><li>Channel manager integrations (AxisRooms, eZee, STAAH, SiteMinder) to keep inventory in sync.</li><li>A partner dashboard for rates, availability, bookings, payouts and reviews.</li></ul> },
        { title: "How onboarding works", body: <ul><li>Tell us about your property.</li><li>Our team verifies your details and helps you set up rooms, rates and videos.</li><li>Your property goes live after a quality review.</li></ul> },
        { title: "Get in touch", body: <p>Email <a href="mailto:bookmestaysupport@gmail.com">bookmestaysupport@gmail.com</a> with your property name, city and a contact number. Existing partners can sign in at the <Link href="/partner">partner panel</Link>.</p> },
      ]}
    />
  );
}
