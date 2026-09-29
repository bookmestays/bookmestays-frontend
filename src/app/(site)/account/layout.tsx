import type { Metadata } from "next";
import { AccountNav } from "@/components/site/account/account-nav";
import { RequireAuth } from "@/components/site/account/require-auth";
import { Container } from "@/components/site/primitives";

export const metadata: Metadata = { title: { default: "My account", template: "%s | BookMeStays" }, robots: { index: false, follow: false } };

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <Container className="py-6 sm:py-8">
      <RequireAuth reason="Sign in to see your bookings and profile.">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <AccountNav />
          <div className="min-w-0">{children}</div>
        </div>
      </RequireAuth>
    </Container>
  );
}
