"use client";

import type { ReactNode } from "react";
import { Building2, CalendarDays, CalendarCheck, LayoutDashboard, MessageSquareText, UserCog, UserRound, Wallet } from "lucide-react";
import { PanelAuthGuard, usePanelAuth } from "@/components/panel/auth";
import { PanelShell, type NavGroup } from "@/components/panel/shell";

function Shell({ children }: { children: ReactNode }) {
  const { can, isOwner } = usePanelAuth();
  const nav: NavGroup[] = [
    {
      items: [
        { href: "/partner", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { href: "/partner/properties", label: "Properties", icon: Building2, hidden: !can("content") },
        { href: "/partner/calendar", label: "Rates & availability", icon: CalendarDays, hidden: !can("inventory") },
        { href: "/partner/bookings", label: "Bookings", icon: CalendarCheck, hidden: !can("bookings") },
        { href: "/partner/payouts", label: "Payouts", icon: Wallet, hidden: !can("payouts") },
        { href: "/partner/reviews", label: "Reviews", icon: MessageSquareText, hidden: !can("reviews") },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/partner/staff", label: "Staff", icon: UserCog, hidden: !isOwner },
        { href: "/partner/profile", label: "Business profile", icon: UserRound },
      ],
    },
  ];
  return (
    <PanelShell title="Partner" nav={nav}>
      {children}
    </PanelShell>
  );
}

export function PartnerShell({ children }: { children: ReactNode }) {
  return (
    <PanelAuthGuard portal="partner">
      <Shell>{children}</Shell>
    </PanelAuthGuard>
  );
}
