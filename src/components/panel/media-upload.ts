"use client";

import { api, ApiError } from "@/lib/api";
import type { Media, MediaKind, MediaOwnerType, MediaTag } from "@/lib/types";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

type Presign = { uploadUrl: string; s3Key: string; publicUrl: string; headers?: Record<string, string> };

export function kindOf(file: File): MediaKind | null {
  if (IMAGE_TYPES.includes(file.type)) return "IMAGE";
  if (VIDEO_TYPES.includes(file.type)) return "VIDEO";
  return null;
}

/** Returns a user-facing error for unsupported files, or null when OK. */
export function validateFile(file: File, allowed: MediaKind[]): string | null {
  const kind = kindOf(file);
  if (!kind || !allowed.includes(kind)) {
    const what = allowed.length === 2 ? "JPEG, PNG, WebP, AVIF images or MP4, MOV, WebM videos" : allowed[0] === "IMAGE" ? "JPEG, PNG, WebP or AVIF images" : "MP4, MOV or WebM videos";
    return `${file.name}: unsupported file type. Use ${what}.`;
  }
  if (kind === "IMAGE" && file.size > MAX_IMAGE_BYTES) return `${file.name}: images must be 15 MB or smaller.`;
  if (kind === "VIDEO" && file.size > MAX_VIDEO_BYTES) return `${file.name}: videos must be 500 MB or smaller.`;
  return null;
}

/** PUT to the presigned URL with upload progress (XHR — fetch has no upload progress). Mirrors `uploadToS3` semantics. */
function putWithProgress(presign: Presign, body: Blob, contentType: string, onProgress?: (fraction: number) => void) {
  const isLocal = !/amazonaws\.com|cloudfront\.net/.test(presign.uploadUrl);
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presign.uploadUrl);
    if (isLocal) xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", contentType);
    for (const [k, v] of Object.entries(presign.headers ?? {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ApiError(xhr.status, "UPLOAD_FAILED", "Upload failed. Please try again.")));
    xhr.onerror = () => reject(new ApiError(0, "UPLOAD_FAILED", "Upload failed — network error or the storage bucket rejected the request."));
    xhr.send(body);
  });
}

/** Presign + upload a single file/blob. Returns the public URL and S3 key (does NOT create a Media row). */
export async function uploadFile(
  file: Blob & { name?: string },
  opts: { ownerType: MediaOwnerType; ownerId?: string | null; kind: MediaKind; fileName?: string; onProgress?: (f: number) => void },
) {
  const contentType = file.type || (opts.kind === "IMAGE" ? "image/jpeg" : "video/mp4");
  const presign = await api<Presign>("/media/presign", {
    method: "POST",
    body: {
      ownerType: opts.ownerType,
      ownerId: opts.ownerId ?? undefined,
      kind: opts.kind,
      fileName: opts.fileName ?? file.name ?? `upload.${contentType.split("/")[1]}`,
      contentType,
      sizeBytes: file.size,
    },
  });
  await putWithProgress(presign, file, contentType, opts.onProgress);
  return { url: presign.publicUrl, s3Key: presign.s3Key };
}

function once(el: HTMLMediaElement, event: string, timeoutMs = 15000) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Timed out reading the video")), timeoutMs);
    const ok = () => {
      clearTimeout(t);
      el.removeEventListener("error", bad);
      resolve();
    };
    const bad = () => {
      clearTimeout(t);
      el.removeEventListener(event, ok);
      reject(new Error("This video could not be read by the browser"));
    };
    el.addEventListener(event, ok, { once: true });
    el.addEventListener("error", bad, { once: true });
  });
}

export function drawVideoFrame(video: HTMLVideoElement, maxWidth = 1600): Promise<Blob> {
  const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((video.videoWidth || 1280) * scale);
  canvas.height = Math.round((video.videoHeight || 720) * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas is not supported in this browser"));
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not capture a frame"))), "image/jpeg", 0.85);
    } catch {
      // SecurityError: tainted canvas (remote video without CORS)
      reject(new Error("Can't capture a frame from this video (storage CORS). Upload a poster image instead."));
    }
  });
}

/** Reads metadata and grabs a poster frame client-side from a video File or URL. */
export async function probeVideo(src: File | string, atSec?: number) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  const objectUrl = typeof src === "string" ? null : URL.createObjectURL(src);
  if (typeof src === "string") video.crossOrigin = "anonymous";
  video.src = objectUrl ?? (src as string);
  try {
    await once(video, "loadeddata");
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const t = atSec ?? Math.min(1, duration / 3);
    if (t > 0) {
      video.currentTime = t;
      await once(video, "seeked");
    }
    let poster: Blob | null = null;
    try {
      poster = await drawVideoFrame(video);
    } catch {
      poster = null;
    }
    return { duration: Math.round(duration), width: video.videoWidth || null, height: video.videoHeight || null, poster };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    video.removeAttribute("src");
    video.load();
  }
}

export function probeImage(file: File) {
  return new Promise<{ width: number | null; height: number | null }>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: null, height: null });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * Full pipeline for one file: validate → probe → (video: upload poster frame) → upload → POST /media.
 */
export async function uploadMedia(
  file: File,
  opts: { ownerType: MediaOwnerType; ownerId: string | null; tag?: MediaTag; onProgress?: (f: number) => void },
): Promise<Media> {
  const kind = kindOf(file);
  if (!kind) throw new Error(`${file.name}: unsupported file type`);
  let posterUrl: string | undefined;
  let meta: { width: number | null; height: number | null; duration?: number } = { width: null, height: null };
  if (kind === "VIDEO") {
    try {
      const v = await probeVideo(file);
      meta = { width: v.width, height: v.height, duration: v.duration };
      if (v.poster) {
        const up = await uploadFile(v.poster, { ownerType: opts.ownerType, ownerId: opts.ownerId, kind: "IMAGE", fileName: `${file.name.replace(/\.[^.]+$/, "")}-poster.jpg` });
        posterUrl = up.url;
      }
    } catch {
      /* poster/metadata are best-effort; the upload itself still proceeds */
    }
  } else {
    meta = await probeImage(file);
  }
  const { url, s3Key } = await uploadFile(file, { ownerType: opts.ownerType, ownerId: opts.ownerId, kind, onProgress: opts.onProgress });
  return api<Media>("/media", {
    method: "POST",
    body: {
      ownerType: opts.ownerType,
      ownerId: opts.ownerId ?? undefined,
      kind,
      s3Key,
      url,
      posterUrl,
      tag: opts.tag ?? (kind === "VIDEO" ? "ROOM_WALKTHROUGH" : "OTHER"),
      title: file.name.replace(/\.[^.]+$/, "").slice(0, 120),
      durationSec: meta.duration,
      width: meta.width ?? undefined,
      height: meta.height ?? undefined,
    },
  });
}
