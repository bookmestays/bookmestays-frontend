"use client";

import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button, Spinner } from "@/components/ui";
import { useAuth } from "../auth-context";

/** Client-side gate for account pages (the API enforces auth; this just shows a friendly prompt). */
export function RequireAuth({ children, reason = "Sign in to see this page." }: { children: ReactNode; reason?: string }) {
  const { status, openLogin } = useAuth();
  if (status === "loading") {
    return (
      <div className="flex justify-center py-24 text-muted">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (status === "anonymous") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Lock className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold text-ink">Please sign in</h1>
        <p className="text-sm text-muted">{reason}</p>
        <Button size="lg" onClick={() => void openLogin()}>
          Sign in with OTP
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}
