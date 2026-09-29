// Browser-side API client. Calls go through the /api rewrite (see next.config.ts)
// so the backend's httpOnly auth cookies are first-party. On 401 it tries one
// silent token refresh, then retries the request.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type Options = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null | (string | number)[]>;
};

export function buildQuery(query?: Options["query"]) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((item) => params.append(k, String(item)));
    else params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

let refreshing: Promise<boolean> | null = null;
const refresh = () =>
  (refreshing ??= fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => setTimeout(() => (refreshing = null), 0)));

export async function api<T = unknown>(path: string, opts: Options = {}, retried = false): Promise<T> {
  const { body, query, headers, ...rest } = opts;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(`/api${path}${buildQuery(query)}`, {
    credentials: "include",
    ...rest,
    headers: {
      ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  if (res.status === 401 && !retried && !path.startsWith("/auth/")) {
    if (await refresh()) return api<T>(path, opts, true);
  }

  const data = res.headers.get("content-type")?.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const err = (data as { error?: { code: string; message: string; details?: unknown } })?.error;
    throw new ApiError(res.status, err?.code ?? "ERROR", err?.message ?? "Something went wrong", err?.details);
  }
  return data as T;
}

/** Uploads a file straight to S3 using a presigned URL from the backend. */
export async function uploadToS3(file: File, presign: { uploadUrl: string; headers?: Record<string, string> }) {
  const isLocal = !/amazonaws\.com|cloudfront\.net/.test(presign.uploadUrl);
  const res = await fetch(presign.uploadUrl, {
    method: "PUT",
    ...(isLocal ? { credentials: "include" as const } : {}),
    headers: { "Content-Type": file.type, ...presign.headers },
    body: file,
  });
  if (!res.ok) throw new ApiError(res.status, "UPLOAD_FAILED", "Upload failed. Please try again.");
}
