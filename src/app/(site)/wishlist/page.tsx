import type { Metadata } from "next";
import { RequireAuth } from "@/components/site/account/require-auth";
import { WishlistView } from "@/components/site/account/wishlist-view";
import { Container } from "@/components/site/primitives";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false, follow: false } };

export default function WishlistPage() {
  return (
    <Container className="py-6 sm:py-8">
      <h1 className="mb-5 text-2xl font-bold text-ink">Your wishlist</h1>
      <RequireAuth reason="Sign in to see the stays and experiences you've saved.">
        <WishlistView />
      </RequireAuth>
    </Container>
  );
}
