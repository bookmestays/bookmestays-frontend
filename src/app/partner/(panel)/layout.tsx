import { Suspense } from "react";
import { PartnerShell } from "../_components/partner-shell";

export default function PartnerPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <PartnerShell>
      <Suspense>{children}</Suspense>
    </PartnerShell>
  );
}
