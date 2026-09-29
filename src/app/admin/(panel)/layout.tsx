import { Suspense } from "react";
import { AdminShell } from "../_components/admin-shell";

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <Suspense>{children}</Suspense>
    </AdminShell>
  );
}
