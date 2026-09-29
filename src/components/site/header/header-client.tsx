"use client";

import { CalendarCheck, ChevronDown, Heart, LayoutDashboard, LogOut, MapPin, Menu, Search, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Modal, Skeleton } from "@/components/ui";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { TAG_SLUGS, TYPE_SLUGS } from "@/lib/search-params";
import { PROPERTY_TYPE_LABELS, TRAVEL_TAG_LABELS, type CityLite, type PropertyType, type TravelTag } from "@/lib/types";
import { isPartnerRole, isStaffRole, useAuth } from "../auth-context";
import { Drawer } from "../drawer";
import { HeaderSearch } from "../search/header-search";
import { usePopover } from "../search/guest-picker";
import { setStoredCity, useStoredCity } from "../search/suggest";
import { useWishlist } from "../wishlist-context";

export function CitySelector({ cities, className }: { cities: CityLite[]; className?: string }) {
  const router = useRouter();
  const stored = useStoredCity();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const shown = cities.filter((c) => c.name.toLowerCase().includes(filter.trim().toLowerCase()));

  const choose = (c: CityLite) => {
    setStoredCity({ slug: c.slug, name: c.name });
    track("destination_selected", { kind: "city", city: c.slug, source: "city_selector" });
    setOpen(false);
    router.push(`/cities/${c.slug}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink hover:bg-surface-2", className)}
        aria-haspopup="dialog"
      >
        <MapPin className="size-4 text-brand" aria-hidden />
        <span className="max-w-28 truncate">{stored?.name ?? "Select city"}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Choose your destination" size="lg">
        <input
          type="search"
          autoFocus
          aria-label="Search cities"
          placeholder="Search for your city"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mb-4 h-11 w-full rounded-lg border border-line px-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
        />
        {cities.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Cities are loading — please try again in a moment.</p>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No city matches “{filter}”.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {shown.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => choose(c)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left text-sm hover:border-brand hover:bg-brand-soft",
                    stored?.slug === c.slug ? "border-brand bg-brand-soft" : "border-line",
                  )}
                >
                  <span className="block font-medium text-ink">{c.name}</span>
                  {c.state && <span className="block text-xs text-muted">{c.state}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link href="/cities" onClick={() => setOpen(false)} className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
          View all cities
        </Link>
      </Modal>
    </>
  );
}

export function MobileSearchButton({ cities }: { cities: CityLite[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label="Search" onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink hover:bg-surface-2 md:hidden">
        <Search className="size-5" aria-hidden />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Search stays">
        <div className="min-h-[50vh]">
          <HeaderSearch cities={cities} autoFocus onDone={() => setOpen(false)} />
        </div>
      </Modal>
    </>
  );
}

export function WishlistLink() {
  const { count } = useWishlist();
  return (
    <Link href="/wishlist" aria-label={`Wishlist${count ? ` (${count} saved)` : ""}`} className="relative hidden rounded-lg p-2 text-ink hover:bg-surface-2 sm:inline-flex">
      <Heart className="size-5" aria-hidden />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

export function UserMenu() {
  const { user, status, openLogin, logout } = useAuth();
  const router = useRouter();
  const { open, setOpen, ref } = usePopover();

  if (status === "loading") return <Skeleton className="h-8 w-20 rounded-full" />;
  if (!user) {
    return (
      <Button size="sm" onClick={() => void openLogin()} className="shrink-0 px-4 whitespace-nowrap">
        Sign in
      </Button>
    );
  }
  const initials = (user.name ?? user.email ?? user.phone ?? "G").trim().charAt(0).toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 hover:bg-surface-2"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{initials}</span>
        <span className="hidden max-w-24 truncate text-sm font-medium text-ink lg:inline">Hi, {user.name?.split(" ")[0] ?? "there"}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-xl">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{user.name ?? "Guest"}</p>
            <p className="truncate text-xs text-muted">{user.email ?? user.phone}</p>
          </div>
          {[
            { href: "/account/bookings", label: "My bookings", Icon: CalendarCheck },
            { href: "/wishlist", label: "Wishlist", Icon: Heart },
            { href: "/account", label: "Profile", Icon: UserIcon },
            ...(isStaffRole(user) ? [{ href: "/admin", label: "Admin panel", Icon: LayoutDashboard }] : []),
            ...(isPartnerRole(user) ? [{ href: "/partner", label: "Partner panel", Icon: LayoutDashboard }] : []),
          ].map(({ href, label, Icon }) => (
            <Link key={href} role="menuitem" href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-2">
              <Icon className="size-4 text-muted" aria-hidden /> {label}
            </Link>
          ))}
          <button
            role="menuitem"
            type="button"
            onClick={async () => {
              setOpen(false);
              await logout();
              router.refresh();
            }}
            className="flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-sm text-ink hover:bg-surface-2"
          >
            <LogOut className="size-4 text-muted" aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function MobileMenu({ cities }: { cities: CityLite[] }) {
  const [open, setOpen] = useState(false);
  const { user, openLogin } = useAuth();
  const close = () => setOpen(false);
  const link = "block rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-surface-2";
  return (
    <>
      <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink hover:bg-surface-2 lg:hidden">
        <Menu className="size-5" aria-hidden />
      </button>
      <Drawer open={open} onClose={close} title="Menu" side="right">
        <nav aria-label="Mobile" className="flex flex-col gap-4 p-3">
          {!user && (
            <Button
              onClick={() => {
                close();
                void openLogin();
              }}
            >
              Sign in / Sign up
            </Button>
          )}
          <div>
            <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">Stays</p>
            {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
              <Link key={t} href={`/${TYPE_SLUGS[t]}`} onClick={close} className={link}>
                {PROPERTY_TYPE_LABELS[t]}
              </Link>
            ))}
          </div>
          <div>
            <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">Travel</p>
            {(Object.keys(TRAVEL_TAG_LABELS) as TravelTag[]).map((t) => (
              <Link key={t} href={`/travel/${TAG_SLUGS[t]}`} onClick={close} className={link}>
                {TRAVEL_TAG_LABELS[t]}
              </Link>
            ))}
          </div>
          <div>
            <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">Discover</p>
            <Link href="/experiences" onClick={close} className={link}>
              Experiences
            </Link>
            <Link href="/videos" onClick={close} className={link}>
              Video tours
            </Link>
            <Link href="/collections" onClick={close} className={link}>
              Collections
            </Link>
            <Link href="/cities" onClick={close} className={link}>
              All cities {cities.length ? `(${cities.length})` : ""}
            </Link>
          </div>
          <div>
            <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">Account</p>
            <Link href="/account/bookings" onClick={close} className={link}>
              My bookings
            </Link>
            <Link href="/wishlist" onClick={close} className={link}>
              Wishlist
            </Link>
            <Link href="/account" onClick={close} className={link}>
              Profile
            </Link>
            <Link href="/help" onClick={close} className={link}>
              Help &amp; support
            </Link>
          </div>
        </nav>
      </Drawer>
    </>
  );
}
