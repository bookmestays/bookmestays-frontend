"use client";

import { Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Seconds remaining until `expiresAt` (ISO); ticks every second. */
export function useCountdown(expiresAt: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return null;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
}

export function HoldTimer({ expiresAt, className }: { expiresAt: string; className?: string }) {
  const left = useCountdown(expiresAt) ?? 0;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <p
      role="timer"
      aria-live="off"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
        left < 120 ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning",
        className,
      )}
    >
      <Timer className="size-4" aria-hidden />
      {left > 0 ? (
        <>
          Rooms held for you for <span className="tabular-nums">{mm}:{ss}</span>
        </>
      ) : (
        "Your hold has expired"
      )}
    </p>
  );
}
