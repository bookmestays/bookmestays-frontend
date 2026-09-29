import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BookingDetailView } from "@/components/site/account/booking-detail-view";

export async function generateMetadata(props: PageProps<"/account/bookings/[code]">): Promise<Metadata> {
  return { title: `Booking ${(await props.params).code}` };
}

export default async function BookingPage(props: PageProps<"/account/bookings/[code]">) {
  const { code } = await props.params;
  return (
    <div>
      <Link href="/account/bookings" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink print:hidden">
        <ChevronLeft className="size-4" aria-hidden /> All bookings
      </Link>
      <BookingDetailView code={code} variant="account" />
    </div>
  );
}
