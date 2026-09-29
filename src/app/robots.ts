import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/public-data";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/partner/", "/partner$", "/account", "/checkout", "/wishlist", "/login", "/signup", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
