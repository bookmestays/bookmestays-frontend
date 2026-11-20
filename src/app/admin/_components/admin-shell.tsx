"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BadgeCheck,
  BarChart3,
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
  Megaphone,
  Newspaper,
  KeyRound,
  MessageSquareQuote,
  MessageSquareText,
  Settings,
  Sparkles,
  TicketPercent,
  Users,
  Wallet,
  Wifi,
} from "lucide-react";
import { PanelAuthGuard, usePanelAuth } from "@/components/panel/auth";
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
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin/analytics", label: "Site analytics", icon: Activity },
      { href: "/admin/channel-managers", label: "Channel managers", icon: Cable },
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
      { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
    ],
  },
  {
    label: "Content (CMS)",
    items: [
      { href: "/admin/blog", label: "Blog", icon: Newspaper },
      { href: "/admin/cms/banners", label: "Hero banners", icon: Film },
      { href: "/admin/cms/home-sections", label: "Home sections", icon: LayoutList },
      { href: "/admin/cms/ads", label: "Ad posters", icon: Megaphone },
      { href: "/admin/cms/cities", label: "Cities & areas", icon: MapPin },
      { href: "/admin/cms/experiences", label: "Experiences", icon: Sparkles },
      { href: "/admin/cms/collections", label: "Collections", icon: Layers },
      { href: "/admin/cms/testimonials", label: "Testimonials", icon: MessageSquareQuote },
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

// Blog writers (BLOG_EDITOR) only get the blog section of the admin panel.
const BLOG_NAV: NavGroup[] = [
  {
    items: [
      { href: "/admin/blog", label: "Blog posts", icon: Newspaper },
      { href: "/admin/change-password", label: "Change password", icon: KeyRound },
    ],
  },
];
const BLOG_EDITOR_PATHS = ["/admin/blog", "/admin/change-password"];

function AdminFrame({ children }: { children: ReactNode }) {
  const { isBlogEditor } = usePanelAuth();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = !isBlogEditor || BLOG_EDITOR_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  useEffect(() => {
    if (!allowed) router.replace("/admin/blog");
  }, [allowed, router]);
  return (
    <PanelShell title={isBlogEditor ? "Blog" : "Admin"} nav={isBlogEditor ? BLOG_NAV : NAV}>
      {allowed ? children : null}
    </PanelShell>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <PanelAuthGuard portal="admin">
      <AdminFrame>{children}</AdminFrame>
    </PanelAuthGuard>
  );
}
