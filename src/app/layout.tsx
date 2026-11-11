import type { Metadata } from "next";
import { Geist_Mono, Inter, Poppins } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const META_PIXEL_ID = "1241173248341250";

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
      <body className="min-h-full flex flex-col">
        {/* Meta Pixel Code */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');`}
        </Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        {/* End Meta Pixel Code */}
        {children}
      </body>
    </html>
  );
}
