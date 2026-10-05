import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import { StaticPage } from "@/components/site/static-page";
import { getSiteMeta } from "@/lib/public-data";

export const metadata: Metadata = { title: "Contact us", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const { support } = await getSiteMeta();
  return (
    <StaticPage
      title="Contact us"
      subtitle="We're here to help before, during and after your stay."
      sections={[
        {
          title: "Talk to us",
          body: (
            <ul className="!ml-0 !list-none space-y-2">
              {support.phone && (
                <li className="!ml-0 flex items-center gap-2">
                  <Phone className="size-4" aria-hidden /> <a href={`tel:${support.phone}`}>{support.phone}</a>
                </li>
              )}
              <li className="!ml-0 flex items-center gap-2">
                <Mail className="size-4" aria-hidden /> <a href={`mailto:${support.email || "bookmestaysupport@gmail.com"}`}>{support.email || "bookmestaysupport@gmail.com"}</a>
              </li>
              {support.whatsapp && (
                <li className="!ml-0 flex items-center gap-2">
                  <MessageCircle className="size-4" aria-hidden /> <a href={`https://wa.me/${support.whatsapp.replace(/\D/g, "")}`}>WhatsApp {support.whatsapp}</a>
                </li>
              )}
            </ul>
          ),
        },
        { title: "Booking questions", body: <p>For an existing booking, please keep your booking reference (e.g. BMS7K2Q9XA) handy — you&apos;ll find it in your confirmation email and under My bookings.</p> },
        { title: "Property partners", body: <p>Own or manage a property? Visit <Link href="/partner-with-us">Partner With Us</Link>.</p> },
      ]}
    />
  );
}
