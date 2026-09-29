import type { Metadata } from "next";
import { BookingsList } from "@/components/site/account/bookings-list";

export const metadata: Metadata = { title: "My bookings" };

export default function BookingsPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">My bookings</h1>
      <BookingsList />
    </div>
  );
}
