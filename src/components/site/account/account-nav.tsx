"use client";

import { CalendarCheck, Heart, LifeBuoy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/account/bookings", label: "My bookings", Icon: CalendarCheck },
  { href: "/wishlist", label: "Wishlist", Icon: Heart },
  { href: "/account", label: "Profile", Icon: User },
  { href: "/help", label: "Help & support", Icon: LifeBuoy },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="min-w-0 lg:sticky lg:top-4 lg:self-start print:hidden">
      <ul className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
        {LINKS.map(({ href, label, Icon }) => {
          const active = href === "/account" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                  active ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
