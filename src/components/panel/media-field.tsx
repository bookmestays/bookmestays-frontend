"use client";
/* eslint-disable @next/next/no-img-element -- arbitrary storage hosts */

import { useRef, useState } from "react";
import { Camera, Film, ImageIcon, Trash2, Upload } from "lucide-react";
import { errorMessage } from "@/lib/use-api";
import type { MediaKind, MediaOwnerType } from "@/lib/types";
import { Button, Input, Modal } from "@/components/ui";
import { probeVideo, uploadFile, validateFile } from "./media-upload";
import { PosterCapture } from "./media-manager";

/**
 * Single-asset upload bound to a URL value (banner video, city/collection cover, OG image…).
 * For videos a poster frame is captured client-side and reported via onPoster.
 */
export function MediaUrlField({
  kind,
  ownerType,
  ownerId,
  value,
  onChange,
  onPoster,
  posterUrl,
  label,
  allowUrlInput = true,
}: {
  kind: MediaKind;
  ownerType: MediaOwnerType;
  ownerId?: string | null;
  value: string | null;
  onChange: (url: string | null) => void;
  /** video only: called with the captured poster URL (and duration) */
  onPoster?: (posterUrl: string | null, meta?: { durationSec?: number }) => void;
  posterUrl?: string | null;
  label: string;
  allowUrlInput?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capture, setCapture] = useState(false);

  const onFile = async (file: File) => {
    const err = validateFile(file, [kind]);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setProgress(0);
    try {
      if (kind === "VIDEO" && onPoster) {
        try {
          const v = await probeVideo(file);
          if (v.poster) {
            const p = await uploadFile(v.poster, { ownerType, ownerId, kind: "IMAGE", fileName: "poster.jpg" });
            onPoster(p.url, { durationSec: v.duration });
          }
        } catch {
          /* poster is best-effort */
        }
      }
      const { url } = await uploadFile(file, { ownerType, ownerId, kind, onProgress: setProgress });
      onChange(url);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setProgress(null);
    }
  };

  const preview = kind === "IMAGE" ? value : (posterUrl ?? null);

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="relative grid aspect-video w-full shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-surface-2 sm:w-56">
          {kind === "VIDEO" && value ? (
            <video src={value} poster={posterUrl ?? undefined} muted controls playsInline preload="metadata" className="size-full object-cover" />
          ) : preview ? (
            <img src={preview} alt="" className="size-full object-cover" />
          ) : kind === "VIDEO" ? (
            <Film className="size-8 text-muted" aria-hidden />
          ) : (
            <ImageIcon className="size-8 text-muted" aria-hidden />
          )}
          {progress !== null && (
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/20" role="progressbar" aria-label={`Uploading ${label}`} aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-brand" style={{ width: `${Math.max(3, progress * 100)}%` }} />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => input.current?.click()} loading={progress !== null}>
              <Upload className="size-4" /> {value ? "Replace" : "Upload"} {kind === "VIDEO" ? "video" : "image"}
            </Button>
            {kind === "VIDEO" && value && onPoster && (
              <Button variant="outline" size="sm" onClick={() => setCapture(true)}>
                <Camera className="size-4" /> Pick poster frame
              </Button>
            )}
            {value && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(null);
                  onPoster?.(null);
                }}
              >
                <Trash2 className="size-4" /> Remove
              </Button>
            )}
          </div>
          {allowUrlInput && <Input aria-label={`${label} URL`} placeholder="…or paste a URL" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className="h-9 text-xs" />}
          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        className="sr-only"
        aria-label={`Upload ${label}`}
        accept={kind === "IMAGE" ? "image/jpeg,image/png,image/webp,image/avif" : "video/mp4,video/quicktime,video/webm"}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Modal open={capture} onClose={() => setCapture(false)} title="Choose poster frame" size="lg">
        {capture && value && (
          <PosterCapture
            media={{ url: value, ownerType, ownerId: ownerId ?? null }}
            onDone={async (url) => {
              onPoster?.(url);
              setCapture(false);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
