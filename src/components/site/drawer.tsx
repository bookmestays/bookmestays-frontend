"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Side / bottom sheet built on <dialog> (focus trap, Esc, backdrop click). */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = "left",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: "left" | "right" | "bottom";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-0 max-h-none max-w-none bg-white p-0 text-ink shadow-2xl backdrop:bg-black/50",
        side === "bottom" ? "mt-auto h-[88dvh] w-full rounded-t-2xl" : "h-dvh w-[88vw] max-w-sm",
        side === "right" && "ml-auto",
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-base font-semibold">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-muted hover:bg-surface-2">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
          {footer && <div className="border-t border-line p-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
