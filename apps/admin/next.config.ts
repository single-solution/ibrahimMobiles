import type { NextConfig } from "next";

/**
 * Security headers for the **admin app**.
 *
 * Same image hosts as the storefront (admin renders the same product
 * imagery for editing) but everything else is locked down: connect-src is
 * same-origin only, frame-ancestors disallowed entirely, no inline-script
 * relaxations beyond what Next.js requires for hydration.
 *
 * If you ever IP-allowlist admin behind a Cloudflare / Vercel Firewall
 * rule, do that at the platform layer; the headers here are the in-app
 * complement.
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
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
