"use client";

import { WifiOff } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClass, EmptyState } from "@/components/ui";
import { track } from "@/lib/analytics";

export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
    track("js_error", { message: (error.message || "Page failed to load").slice(0, 200), digest: error.digest, kind: "error_page" });
  }, [error]);
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-20">
      <EmptyState
        icon={<WifiOff />}
        title="Something went wrong"
        description="We couldn't load this page. Please check your connection and try again."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => retry()}>Try again</Button>
            <Link href="/" className={buttonClass("outline")}>
              Go home
            </Link>
          </div>
        }
      />
    </div>
  );
}
