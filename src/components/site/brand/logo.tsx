import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

// Official BookMeStays brand assets (public/brand). "light" variants are for dark backgrounds.
const ASSETS = {
  logo: { src: "/brand/logo.png", light: "/brand/logo-light.png", ratio: 1318 / 320 },
  tagline: { src: "/brand/logo-tagline.png", light: "/brand/logo-tagline-light.png", ratio: 1318 / 320 },
  mark: { src: "/brand/logo-mark.png", light: "/brand/logo-mark-light.png", ratio: 250 / 320 },
} as const;

/** Pin + house mark on its own (panel sidebars, tight spaces). */
export function LogoMark({
  className,
  tone = "dark",
  size = 36,
}: {
  className?: string;
  tone?: "dark" | "light";
  size?: number;
  /** kept for older call sites that passed an svg gradient id */
  id?: string;
}) {
  const a = ASSETS.mark;
  return (
    <Image
      src={tone === "light" ? a.light : a.src}
      alt="BookMeStays"
      width={Math.round(size * a.ratio)}
      height={size}
      priority
      className={cn("h-9 w-auto", className)}
    />
  );
}

/**
 * Full lockup. `showTagline` adds "Your perfect stay, simply booked" under the wordmark;
 * `tone="light"` switches to the white version for dark backgrounds.
 */
export function Logo({
  className,
  tone = "dark",
  href = "/",
  showTagline = false,
  height = 40,
  priority = true,
}: {
  className?: string;
  tone?: "dark" | "light";
  href?: string | null;
  showTagline?: boolean;
  height?: number;
  priority?: boolean;
  /** kept for older call sites */
  markClassName?: string;
}) {
  const a = showTagline ? ASSETS.tagline : ASSETS.logo;
  const img = (
    <Image
      src={tone === "light" ? a.light : a.src}
      alt="BookMeStays — your perfect stay, simply booked"
      width={Math.round(height * a.ratio)}
      height={height}
      priority={priority}
      className={cn("h-8 w-auto sm:h-10", className)}
    />
  );
  if (!href) return img;
  return (
    <Link href={href} aria-label="BookMeStays home" className="inline-flex shrink-0 items-center">
      {img}
    </Link>
  );
}
