import type { CityLite } from "@/lib/types";
import { Logo } from "../primitives";
import { HeaderSearch } from "../search/header-search";
import { DiscoveryNav } from "./discovery-nav";
import { CitySelector, MobileMenu, MobileSearchButton, UserMenu, WishlistLink } from "./header-client";

export function SiteHeader({ cities }: { cities: CityLite[] }) {
  return (
    <header className="relative z-40 bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <div className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
          <Logo />
          <HeaderSearch cities={cities} className="mx-2 hidden max-w-xl flex-1 md:block lg:mx-6" />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <MobileSearchButton cities={cities} />
            <CitySelector cities={cities} className="hidden sm:inline-flex" />
            <WishlistLink />
            <UserMenu />
            <MobileMenu cities={cities} />
          </div>
        </div>
      </div>
      <DiscoveryNav />
    </header>
  );
}
