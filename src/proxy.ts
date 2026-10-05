import { NextResponse, type NextRequest } from "next/server";

// Subdomain routing: admin.<domain>/x → /admin/x, partner.<domain>/x → /partner/x.
// In local development just open http://localhost:3000/admin or /partner directly.
const ADMIN_HOST = process.env.ADMIN_HOST ?? "admin.bookmestays.in";
const PARTNER_HOST = process.env.PARTNER_HOST ?? "partner.bookmestays.in";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname } = request.nextUrl;

  const section =
    host === ADMIN_HOST || host.startsWith("admin.") ? "admin" : host === PARTNER_HOST || host.startsWith("partner.") ? "partner" : null;

  if (section && !pathname.startsWith(`/${section}`)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${section}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|mp4|m3u8)$).*)"],
};
