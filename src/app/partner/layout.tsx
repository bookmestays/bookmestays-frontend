import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: { default: "Partner", template: "%s · BookMeStays Partner" },
  robots: { index: false, follow: false },
};

export default function PartnerRootLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
