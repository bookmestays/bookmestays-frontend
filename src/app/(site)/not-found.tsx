import { MapPinOff } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/site/primitives";
import { buttonClass, EmptyState } from "@/components/ui";

export default function SiteNotFound() {
  return (
    <Container className="py-20">
      <EmptyState
        icon={<MapPinOff />}
        title="We couldn't find that page"
        description="The stay or page you're looking for may have been moved, or is no longer available."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/" className={buttonClass("primary")}>
              Go home
            </Link>
            <Link href="/search" className={buttonClass("outline")}>
              Search stays
            </Link>
          </div>
        }
      />
    </Container>
  );
}
