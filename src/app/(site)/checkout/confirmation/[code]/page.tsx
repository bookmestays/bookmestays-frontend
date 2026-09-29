import type { Metadata } from "next";
import { BookingDetailView } from "@/components/site/account/booking-detail-view";
import { RequireAuth } from "@/components/site/account/require-auth";
import { Container } from "@/components/site/primitives";

export const metadata: Metadata = { title: "Booking confirmed", robots: { index: false, follow: false } };

export default async function ConfirmationPage(props: PageProps<"/checkout/confirmation/[code]">) {
  const { code } = await props.params;
  return (
    <Container className="max-w-4xl py-8">
      <RequireAuth reason="Sign in to view your booking confirmation.">
        <BookingDetailView code={code} variant="confirmation" />
      </RequireAuth>
    </Container>
  );
}
