import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · BookMeStays Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
