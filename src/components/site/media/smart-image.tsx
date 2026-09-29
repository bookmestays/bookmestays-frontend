"use client";

import { ImageOff } from "lucide-react";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

// Hosts configured in next.config.ts images.remotePatterns. Anything else (e.g. the
// dev backend's local uploads on http://localhost:4000) is served unoptimized so
// next/image never throws for an unknown host.
const OPTIMIZABLE = [/\.amazonaws\.com$/, /\.cloudfront\.net$/, /^images\.unsplash\.com$/];

export function isOptimizable(src: string) {
  if (src.startsWith("/")) return true;
  try {
    const u = new URL(src);
    return u.protocol === "https:" && OPTIMIZABLE.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

type Props = Omit<ImageProps, "src" | "alt"> & { src: string | null | undefined; alt: string; fallbackClassName?: string };

/** next/image with a graceful placeholder when the src is missing or fails to load. */
export function SmartImage({ src, alt, className, fallbackClassName, fill, ...rest }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-surface-2 to-line text-muted",
          fill && "absolute inset-0",
          className,
          fallbackClassName,
        )}
      >
        <ImageOff className="size-6 opacity-60" aria-hidden />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      unoptimized={!isOptimizable(src)}
      onError={() => setFailedSrc(src)}
      {...rest}
    />
  );
}
