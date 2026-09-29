"use client";

import Link from "next/link";
import { LogoMark } from "@/components/site/brand/logo";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { ChevronDown, LogOut, Menu, UserRound, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePanelAuth } from "./auth";
import { ROLE_LABELS } from "./labels";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** exact match only (for dashboard roots) */
  exact?: boolean;
  badge?: number | null;
  hidden?: boolean;
};
export type NavGroup = { label?: string; items: NavItem[] };

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function PanelShell({
  title,
  nav,
  children,
  topRight,
}: {
  title: string;
  nav: NavGroup[];
  children: ReactNode;
  topRight?: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  // close the mobile drawer on navigation (state adjustment during render, no effect needed)
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <Link href={nav[0]?.items[0]?.href ?? "/"} className="flex items-center gap-2 font-semibold text-white">
          <LogoMark tone="light" size={28} className="h-7 w-auto shrink-0" />
          <span className="truncate font-display">
            BookMeStays <span className="font-normal text-white/60">{title}</span>
          </span>
        </Link>
        <button className="rounded-md p-1 text-white/70 hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="size-5" />
        </button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
        {nav.map((g, gi) => {
          const items = g.items.filter((i) => !i.hidden);
          if (!items.length) return null;
          return (
            <div key={gi}>
              {g.label && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">{g.label}</p>}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(pathname, item);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand",
                          active ? "bg-white/12 font-medium text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {!!item.badge && (
                          <span className="rounded-full bg-brand px-1.5 text-[11px] font-semibold leading-5 text-white">{item.badge > 99 ? "99+" : item.badge}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full bg-surface-2">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 bg-surface-3 lg:block">{sidebar}</aside>
      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface-3 shadow-xl">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-3 sm:px-6">
          <button className="rounded-md p-2 text-ink hover:bg-surface-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          {topRight}
          <UserMenu />
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-3 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}

function UserMenu() {
  const { me, logout, portal } = usePanelAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const name = me.user.name || me.user.email || "Account";
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{initials}</span>
        <span className="hidden max-w-40 truncate text-left sm:block">
          <span className="block truncate font-medium text-ink">{name}</span>
          <span className="block text-xs text-muted">{ROLE_LABELS[me.user.role]}</span>
        </span>
        <ChevronDown className="size-4 text-muted" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg">
          <div className="border-b border-line px-3 py-2 text-xs text-muted">
            <p className="truncate font-medium text-ink">{name}</p>
            <p className="truncate">{me.user.email}</p>
          </div>
          {portal === "partner" && (
            <Link role="menuitem" href="/partner/profile" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-2" onClick={() => setOpen(false)}>
              <UserRound className="size-4" /> Profile
            </Link>
          )}
          <Link
            role="menuitem"
            href={`/${portal}/change-password`}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-2"
            onClick={() => setOpen(false)}
          >
            <UserRound className="size-4" /> Change password
          </Link>
          <button role="menuitem" onClick={() => logout()} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-surface-2">
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
