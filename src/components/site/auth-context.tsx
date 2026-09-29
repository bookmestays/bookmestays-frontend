"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui";
import { api } from "@/lib/api";
import type { MeResponse, User } from "@/lib/types";
import { LoginForm } from "./login-form";

type Status = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  user: User | null;
  status: Status;
  /** Re-fetches /auth/me. */
  reload: () => Promise<User | null>;
  /** Called by the login form after a successful login/registration. */
  signedIn: (user: User) => void;
  logout: () => Promise<void>;
  /** Opens the quick login modal. Resolves with the user, or null if dismissed. */
  openLogin: (reason?: string) => Promise<User | null>;
  /** Resolves immediately when signed in, otherwise opens the login modal. */
  requireAuth: (reason?: string) => Promise<User | null>;
  updateUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [modal, setModal] = useState<{ open: boolean; reason?: string }>({ open: false });
  const resolverRef = useRef<((u: User | null) => void) | null>(null);
  const userRef = useRef<User | null>(null);

  const apply = useCallback((u: User | null) => {
    userRef.current = u;
    setUser(u);
    setStatus(u ? "authenticated" : "anonymous");
  }, []);

  const reload = useCallback(async () => {
    try {
      const me = await api<MeResponse>("/auth/me");
      apply(me.user);
      return me.user;
    } catch {
      apply(null);
      return null;
    }
  }, [apply]);

  useEffect(() => {
    let cancelled = false;
    api<MeResponse>("/auth/me")
      .then((me) => !cancelled && apply(me.user))
      .catch(() => !cancelled && apply(null));
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const closeModal = useCallback((u: User | null) => {
    setModal({ open: false });
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(u);
  }, []);

  const signedIn = useCallback(
    (u: User) => {
      apply(u);
      if (resolverRef.current) closeModal(u);
    },
    [apply, closeModal],
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // cookies may already be gone
    }
    apply(null);
  }, [apply]);

  const openLogin = useCallback((reason?: string) => {
    resolverRef.current?.(null);
    setModal({ open: true, reason });
    return new Promise<User | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const requireAuth = useCallback(
    (reason?: string) => (userRef.current ? Promise.resolve(userRef.current) : openLogin(reason)),
    [openLogin],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, reload, signedIn, logout, openLogin, requireAuth, updateUser: apply }),
    [user, status, reload, signedIn, logout, openLogin, requireAuth, apply],
  );

  return (
    <AuthContext value={value}>
      {children}
      <Modal open={modal.open} onClose={() => closeModal(null)} title="Sign in to BookMeStays" size="sm">
        {modal.reason && <p className="mb-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-ink-2">{modal.reason}</p>}
        <LoginForm onSuccess={signedIn} compact />
      </Modal>
    </AuthContext>
  );
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export const isStaffRole = (u: User | null) => u?.role === "SUPER_ADMIN" || u?.role === "ADMIN_STAFF";
export const isPartnerRole = (u: User | null) => u?.role === "PARTNER_OWNER" || u?.role === "PARTNER_STAFF";
