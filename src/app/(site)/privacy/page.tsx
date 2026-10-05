import type { Metadata } from "next";
import { StaticPage } from "@/components/site/static-page";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <StaticPage
      title="Privacy policy"
      updated="September 2026"
      subtitle="How we collect, use and protect your information. (Placeholder copy — final legal text to be provided.)"
      sections={[
        { title: "Information we collect", body: <ul><li>Account details: name, email, mobile number.</li><li>Booking details: dates, guests, special requests.</li><li>Usage data: pages viewed and searches, used to improve the service.</li></ul> },
        { title: "How we use it", body: <p>To process bookings, send confirmations and updates, provide support, prevent fraud and improve BookMeStays. We share booking details with the property you book so they can host you.</p> },
        { title: "Payments", body: <p>Payments are processed by Razorpay. We do not store your card or bank details.</p> },
        { title: "Your choices", body: <p>You can update your profile at any time and ask us to delete your account by writing to <a href="mailto:bookmestaysupport@gmail.com">bookmestaysupport@gmail.com</a>.</p> },
        { title: "Security", body: <p>We use industry-standard safeguards including encryption in transit and secure, httpOnly session cookies.</p> },
      ]}
    />
  );
}
