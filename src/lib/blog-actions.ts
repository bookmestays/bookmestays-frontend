"use server";

import { updateTag } from "next/cache";
import { serverApi } from "./api-server";
import type { MeResponse } from "./types";

/** Tag on every public blog fetch (index, post, category, sitemaps, RSS). */
const BLOG_TAG = "blog";

/**
 * Called by the admin blog editor after a save / publish / delete so the public /blog pages,
 * the sitemap and the RSS feed show the change immediately (instead of after the ISR window).
 * Only signed-in admin-panel users (admins + blog writers) may trigger it.
 */
export async function refreshBlogPages() {
  try {
    const me = await serverApi<MeResponse>("/auth/me");
    if (!["SUPER_ADMIN", "ADMIN_STAFF", "BLOG_EDITOR"].includes(me.user.role)) return { ok: false };
  } catch {
    return { ok: false };
  }
  updateTag(BLOG_TAG);
  return { ok: true };
}
