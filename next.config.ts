import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // /api/* rewrites proxy to the backend: allow slow requests (payments, booking changes) up to 2 minutes
    proxyTimeout: 120_000,
    // Remote images (S3/CloudFront, demo Unsplash) can be slow on first fetch — default is 7 s
    imgOptTimeoutInSeconds: 30,
  },
  // Browser calls go to /api/* on the same origin, so auth cookies are first-party.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/:path*` }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
