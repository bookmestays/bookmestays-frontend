import type { Metadata } from "next";
import { Geist_Mono, Inter, Poppins } from "next/font/google";
import "./globals.css";

// Inter for UI text; Poppins for headings, echoing the rounded geometric wordmark in the logo.
const sans = Inter({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const display = Poppins({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "BookMeStays — Your perfect stay. Simply Booked.",
    template: "%s | BookMeStays",
  },
  description:
    "See the property before you book. Hotels, villas, farmhouses, homestays and heritage stays with real video walkthroughs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
