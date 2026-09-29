"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { usePanelAuth } from "@/components/panel/auth";

/** Hides a page from partner staff without the given permission (owners always pass). */
export function RequirePermission({ perm, children }: { perm: string | "owner"; children: ReactNode }) {
  const { can, isOwner } = usePanelAuth();
  const ok = perm === "owner" ? isOwner : can(perm);
  if (ok) return <>{children}</>;
  return (
    <Card>
      <EmptyState icon={<Lock />} title="No access" description={perm === "owner" ? "Only the account owner can manage this." : "Ask your account owner to grant you access to this section."} />
    </Card>
  );
}
