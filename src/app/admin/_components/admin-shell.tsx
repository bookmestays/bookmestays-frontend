"use client";

import type { ReactNode } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarCheck,
  ClipboardList,
  Cable,
  Film,
  Handshake,
  LayoutDashboard,
  LayoutList,
  Layers,
  MapPin,
  MessageSquareText,
  Settings,
  Sparkles,
  TicketPercent,
  Users,
  Wallet,
  Wifi,
} from "lucide-react";
import { PanelAuthGuard } from "@/components/panel/auth";
import { PanelShell, type NavGroup } from "@/components/panel/shell";

const NAV: NavGroup[] = [
  {
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/approvals", label: "Approvals", icon: BadgeCheck },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/partners", label: "Partners", icon: Handshake },
      { href: "/admin/properties", label: "Properties", icon: Building2 },
      { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
      { href: "/admin/settlements", label: "Settlements", icon: Wallet },
      { href: "/admin/channel-managers", label: "Channel managers", icon: Cable },
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
      { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
    ],
  },
  {
    label: "Content (CMS)",
    items: [
      { href: "/admin/cms/banners", label: "Hero banners", icon: Film },
      { href: "/admin/cms/home-sections", label: "Home sections", icon: LayoutList },
      { href: "/admin/cms/cities", label: "Cities & areas", icon: MapPin },
      { href: "/admin/cms/experiences", label: "Experiences", icon: Sparkles },
      { href: "/admin/cms/collections", label: "Collections", icon: Layers },
      { href: "/admin/cms/amenities", label: "Amenities", icon: Wifi },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/audit-logs", label: "Audit logs", icon: ClipboardList },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <PanelAuthGuard portal="admin">
      <PanelShell title="Admin" nav={NAV}>
        {children}
      </PanelShell>
    </PanelAuthGuard>
  );
}
