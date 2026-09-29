"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useAutoplayAllowed, useCanHover } from "../hooks";
import { SmartImage } from "./smart-image";

type Props = {
  src?: string | null;
  hlsUrl?: string | null;
  poster?: string | null;
  /** Describes the video for assistive tech (also the poster's alt). */
  alt: string;
  className?: string;
  /** "auto": play whenever in view (hero, video feed).
   *  "hover": desktop plays while `active` (card hovered); touch devices play when the card is near the screen centre.
   *  "controlled": plays while `active` and in view (carousels). */
  trigger?: "auto" | "hover" | "controlled";
  active?: boolean;
  /** Next/image `sizes` for the poster. */
  sizes?: string;
  /** Poster is the LCP element (hero). */
  eagerPoster?: boolean;
  onPlayStart?: () => void;
  onComplete?: () => void;
};

const CENTER_MARGIN = "-35% -25% -35% -25%";

/**
 * Muted, inline, looping preview video with poster fallback.
 * - attaches the source only when near the viewport (lazy)
 * - plays only while visible, pauses otherwise
 * - uses hls.js when `hlsUrl` is given and the browser lacks native HLS
 * - poster only for prefers-reduced-motion / Data Saver / playback errors
 */
export function SmartVideo({
  src,
  hlsUrl,
  poster,
  alt,
  className,
  trigger = "auto",
  active = false,
  sizes = "100vw",
  eagerPoster,
  onPlayStart,
  onComplete,
}: Props) {
  const allowed = useAutoplayAllowed();
  const canHover = useCanHover();
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [centered, setCentered] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);
  const completedRef = useRef(false);

  const hasSource = !!(src || hlsUrl);
  const enabled = allowed && hasSource && !failed;
  const wantPlay =
    trigger === "auto" ? visible : trigger === "controlled" ? active && visible : canHover ? active && visible : centered;

  // Visibility tracking (near → lazy-attach, visible → play/pause, centered → touch previews).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !enabled || typeof IntersectionObserver === "undefined") return;
    const nearObs = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "300px" });
    const visObs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && e.intersectionRatio >= 0.25), {
      threshold: [0, 0.25, 0.5],
    });
    const centerObs = trigger === "hover" ? new IntersectionObserver(([e]) => setCentered(e.isIntersecting), { rootMargin: CENTER_MARGIN }) : null;
    nearObs.observe(el);
    visObs.observe(el);
    centerObs?.observe(el);
    return () => {
      nearObs.disconnect();
      visObs.disconnect();
      centerObs?.disconnect();
    };
  }, [enabled, trigger]);

  // Hover-triggered previews only load once first wanted, to save bandwidth.
  const shouldAttach = enabled && near && (trigger !== "hover" || wantPlay || ready);

  // Attach the source (native / hls.js / mp4 fallback).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !shouldAttach) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;
    v.muted = true;
    const nativeHls = !!hlsUrl && v.canPlayType("application/vnd.apple.mpegurl") !== "";

    if (hlsUrl && nativeHls) {
      v.src = hlsUrl;
    } else if (hlsUrl) {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (!Hls.isSupported()) {
            if (src) v.src = src;
            else setFailed(true);
            return;
          }
          const hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 12 });
          destroy = () => hls.destroy();
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (!data.fatal) return;
            hls.destroy();
            destroy = undefined;
            if (src) v.src = src;
            else setFailed(true);
          });
          hls.loadSource(hlsUrl);
          hls.attachMedia(v);
        })
        .catch(() => {
          if (cancelled) return;
          if (src) v.src = src;
          else setFailed(true);
        });
    } else if (src) {
      v.src = src;
    }
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [shouldAttach, hlsUrl, src]);

  // Play / pause.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !shouldAttach) return;
    if (wantPlay) v.play().catch(() => {});
    else v.pause();
  }, [wantPlay, shouldAttach]);

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden bg-ink/10", className)}>
      <SmartImage
        src={poster}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        loading={eagerPoster ? "eager" : "lazy"}
        fetchPriority={eagerPoster ? "high" : undefined}
      />
      {enabled && (
        <video
          ref={videoRef}
          aria-label={alt}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            ready ? "opacity-100" : "opacity-0",
          )}
          muted
          playsInline
          autoPlay={wantPlay}
          loop
          preload="metadata"
          poster={poster ?? undefined}
          disablePictureInPicture
          onCanPlay={(e) => {
            if (wantPlay) e.currentTarget.play().catch(() => {});
          }}
          onPlaying={() => {
            setReady(true);
            if (!startedRef.current) {
              startedRef.current = true;
              onPlayStart?.();
            }
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (!completedRef.current && v.duration && v.currentTime >= v.duration - 0.4) {
              completedRef.current = true;
              onComplete?.();
            }
          }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
