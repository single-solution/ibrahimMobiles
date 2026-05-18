import type { NextConfig } from "next";

/**
 * Security headers for the **storefront**. Tight CSP, customer-friendly:
 * allows the marketing image hosts (Unsplash, simpleicons) and nothing else.
 *
 * The admin app ships a stricter CSP variant (no third-party image hosts,
 * upload-only) and lives in apps/admin/next.config.ts.
 */
const isProduction = process.env.NODE_ENV === "production";

const baseSecurityHeaders = [
  { key: "X-XSS-Protection", value: "0" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://images.unsplash.com https://cdn.simpleicons.org",
      "font-src 'self' data:",
      "connect-src 'self'",
      "media-src 'self'",
      "manifest-src 'self'",
      ...(isProduction ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  },
];

const securityHeaders = isProduction
  ? [
      ...baseSecurityHeaders,
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    ]
  : baseSecurityHeaders;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Treat the workspace packages as part of the build so Next.js compiles
  // their TypeScript instead of expecting a published .js bundle.
  transpilePackages: ["@store/db", "@store/shared"],
  // Keep server-only Node packages OUT of the Webpack bundle so they're
  // resolved at runtime from `node_modules`. Critical for `pino`/
  // `pino-pretty`/`thread-stream` whose internal `lib/worker.js` is spawned
  // via `worker_threads` and breaks when Webpack re-paths it into a vendor
  // chunk (the symptom: `Cannot find module '.next/server/vendor-chunks/lib/
  // worker.js'` followed by "the worker thread exited" in dev).
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "thread-stream",
    "pino-abstract-transport",
    "sonic-boom",
    "mongoose",
    "bcryptjs",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
    ],
    // Some seed records reference Unsplash URLs that 404 on the upstream
    // CDN. Cache the (negative) response for an hour so the optimizer
    // doesn't re-fetch every minute and spam the dev console — the
    // client-side ProductImage already gracefully falls back to its
    // PhoneVisual placeholder on `onError`, so users never see the 404.
    minimumCacheTTL: 3600,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
