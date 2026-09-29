"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import type { MeResponse, Role } from "@/lib/types";
import { Spinner } from "@/components/ui";
import { ErrorState } from "@/components/ui";

export type Portal = "admin" | "partner";

const PORTAL_ROLES: Record<Portal, Role[]> = {
  admin: ["SUPER_ADMIN", "ADMIN_STAFF"],
  partner: ["PARTNER_OWNER", "PARTNER_STAFF"],
};

type AuthCtx = {
  me: MeResponse;
  portal: Portal;
  reload: () => void;
  logout: () => Promise<void>;
  /** partner permission check; owners & admins always pass */
  can: (permission: string) => boolean;
  isOwner: boolean;
  isSuperAdmin: boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

export function usePanelAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePanelAuth must be used inside <PanelAuthGuard>");
  return v;
}

async function apiLogout() {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {
    /* ignore — cookies may already be gone */
  }
}

type State = { status: "loading" } | { status: "ok"; me: MeResponse } | { status: "error"; message: string };

/**
 * Loads /auth/me and redirects to the portal login when unauthenticated or the role doesn't belong to the portal.
 * Partner users flagged `mustChangePassword` are forced to /partner/change-password.
 * `allowPasswordChange` lets the change-password page itself render.
 */
export function PanelAuthGuard({ portal, children, allowPasswordChange = false }: { portal: Portal; children: ReactNode; allowPasswordChange?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<State>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<MeResponse>("/auth/me")
      .then((me) => {
        if (cancelled) return;
        if (!PORTAL_ROLES[portal].includes(me.user.role)) {
          router.replace(`/${portal}/login?reason=role`);
          return;
        }
        if (portal === "partner" && me.user.mustChangePassword && !allowPasswordChange) {
          router.replace("/partner/change-password");
          return;
        }
        setState({ status: "ok", me });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          router.replace(`/${portal}/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setState({ status: "error", message: e instanceof ApiError ? e.message : "Could not reach the server." });
      });
    return () => {
      cancelled = true;
    };
    // pathname intentionally excluded: auth is checked once per mount / reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal, nonce, allowPasswordChange, router]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const logout = useCallback(async () => {
    await apiLogout();
    router.replace(`/${portal}/login`);
  }, [portal, router]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-2 text-muted">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-2 p-4">
        <div className="w-full max-w-md">
          <ErrorState message={state.message} onRetry={reload} />
        </div>
      </div>
    );
  }

  const me = state.me;
  const isOwner = me.user.role === "PARTNER_OWNER";
  const isAdmin = me.user.role === "SUPER_ADMIN" || me.user.role === "ADMIN_STAFF";
  const value: AuthCtx = {
    me,
    portal,
    reload,
    logout,
    isOwner,
    isSuperAdmin: me.user.role === "SUPER_ADMIN",
    can: (p) => isAdmin || isOwner || me.permissions.includes(p),
  };
  return <Ctx value={value}>{children}</Ctx>;
}
