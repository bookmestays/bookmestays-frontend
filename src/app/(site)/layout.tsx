import { ToastProvider } from "@/components/ui";
import { AuthProvider } from "@/components/site/auth-context";
import { SiteHeader } from "@/components/site/header/site-header";
import { NoticeMarquee } from "@/components/site/header/notice-marquee";
import { SiteFooter } from "@/components/site/site-footer";
import { WishlistProvider } from "@/components/site/wishlist-context";
import { getSiteMeta } from "@/lib/public-data";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const meta = await getSiteMeta();
  return (
    <ToastProvider>
      <AuthProvider>
        <WishlistProvider>
          <div className="flex min-h-dvh flex-col bg-white">
            <SiteHeader cities={meta.cities} />
            <NoticeMarquee notice={meta.notice} />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter support={meta.support} />
          </div>
        </WishlistProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
