import { MapPinOff } from "lucide-react";
import Link from "next/link";
import { buttonClass, EmptyState } from "@/components/ui";

// Fallback for URLs that match no route at all (site, admin or partner).
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-20">
      <EmptyState
        icon={<MapPinOff />}
        title="We couldn't find that page"
        description="The page you're looking for may have been moved, or is no longer available."
        action={
          <Link href="/" className={buttonClass("primary")}>
            Go to BookMeStays
          </Link>
        }
      />
    </main>
  );
}
