"use client";

import { Heart } from "lucide-react";
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { useAuth } from "./auth-context";

export type WishItemType = "PROPERTY" | "EXPERIENCE";
type Ids = Record<WishItemType, string[]>;
const EMPTY: Ids = { PROPERTY: [], EXPERIENCE: [] };

type Ctx = {
  has: (type: WishItemType, id: string) => boolean;
  toggle: (type: WishItemType, id: string, name?: string) => Promise<void>;
  count: number;
};
const WishlistContext = createContext<Ctx | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, requireAuth } = useAuth();
  const toast = useToast();
  // ids are stored with the user they belong to so logout/login never shows stale hearts.
  const [state, setState] = useState<{ userId: string | null; ids: Ids }>({ userId: null, ids: EMPTY });
  const ids = user && state.userId === user.id ? state.ids : EMPTY;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api<Ids>("/wishlist/ids")
      .then((r) => !cancelled && setState({ userId: user.id, ids: { PROPERTY: r.PROPERTY ?? [], EXPERIENCE: r.EXPERIENCE ?? [] } }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const has = useCallback((type: WishItemType, id: string) => ids[type].includes(id), [ids]);

  const toggle = useCallback(
    async (type: WishItemType, id: string, name?: string) => {
      const u = await requireAuth("Sign in to save stays and experiences to your wishlist.");
      if (!u) return;
      // Right after a fresh login the ids may not be loaded yet — treat as "not saved" (POST is idempotent).
      const saved = user?.id === u.id && ids[type].includes(id);
      setState((s) => {
        const base = s.userId === u.id ? s.ids : EMPTY;
        return { userId: u.id, ids: { ...base, [type]: saved ? base[type].filter((x) => x !== id) : [...base[type].filter((x) => x !== id), id] } };
      });
      try {
        if (saved) await api(`/wishlist/${type}/${id}`, { method: "DELETE" });
        else {
          await api("/wishlist", { method: "POST", body: { itemType: type, itemId: id } });
          track("wishlist_added", { itemType: type, itemId: id });
          toast.success(name ? `Saved “${name}” to your wishlist` : "Saved to your wishlist");
        }
      } catch {
        // roll back
        setState((s) => ({
          userId: u.id,
          ids: { ...s.ids, [type]: saved ? [...s.ids[type].filter((x) => x !== id), id] : s.ids[type].filter((x) => x !== id) },
        }));
        toast.error("Couldn't update your wishlist. Please try again.");
      }
    },
    [requireAuth, toast, user, ids],
  );

  const value = useMemo(() => ({ has, toggle, count: ids.PROPERTY.length + ids.EXPERIENCE.length }), [has, toggle, ids]);
  return <WishlistContext value={value}>{children}</WishlistContext>;
}

export function useWishlist() {
  const ctx = use(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}

/** Heart toggle for cards and detail pages. */
export function WishlistButton({
  type,
  id,
  name,
  className,
  variant = "overlay",
}: {
  type: WishItemType;
  id: string;
  name?: string;
  className?: string;
  variant?: "overlay" | "plain";
}) {
  const { has, toggle } = useWishlist();
  const saved = has(type, id);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name ?? "item"} from wishlist` : `Save ${name ?? "item"} to wishlist`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(type, id, name);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        variant === "overlay" ? "size-9 bg-white/90 text-ink shadow-sm backdrop-blur hover:bg-white" : "size-10 border border-line bg-white hover:bg-surface-2",
        className,
      )}
    >
      <Heart className={cn("size-[18px]", saved ? "fill-brand text-brand" : "")} aria-hidden />
    </button>
  );
}
