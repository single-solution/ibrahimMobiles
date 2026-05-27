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
      "img-src 'self' blob: data: https://images.unsplash.com https://cdn.simpleicons.org https://*.public.blob.vercel-storage.com",
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
  // Keep the Next.js router cache short so the storefront reflects fresh
  // catalog data (new products, refreshed hero rail, updated prices) when
  // a visitor navigates back to the homepage or category pages without a
  // full reload. The defaults (5 min for prefetched static routes) were
  // making the hero feel "stuck" until F5. `static` must be ≥ 30s; we use
  // 30s for both buckets so client navigations refetch on roughly the same
  // cadence as the homepage's `revalidate = 30` ISR window.
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
    optimizePackageImports: ["lucide-react", "gsap"],
  },
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
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
    // Cache negative remote-image responses for an hour so the optimizer
    // does not repeatedly fetch a broken upstream asset.
    minimumCacheTTL: 3600,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [{ source: "/wishlist", destination: "/shop", permanent: true }];
  },
};

export default nextConfig;
