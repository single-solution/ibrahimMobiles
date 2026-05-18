/**
 * Resolve the canonical public base URL for the storefront.
 *
 * Order of preference:
 *   1. `STOREFRONT_BASE_URL` — explicit override for production deploys.
 *   2. `NEXT_PUBLIC_SITE_URL` — fallback used by the client and SEO tags.
 *   3. `VERCEL_PROJECT_PRODUCTION_URL` — set automatically on Vercel.
 *   4. `AUTH_URL` — already required by Auth.js, so it's always defined
 *      somewhere a sitemap entry needs to exist.
 *   5. `http://localhost:3000` — last-resort dev fallback so generation
 *      doesn't crash when run outside a configured environment.
 *
 * The brand name is never embedded here — production deploys MUST set
 * `STOREFRONT_BASE_URL` (or one of the higher-priority vars).
 */
const LOCAL_FALLBACK = "http://localhost:3000";

export function getStorefrontBaseUrl(): string {
  const candidates = [
    process.env.STOREFRONT_BASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.AUTH_URL,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate.replace(/\/$/, "");
    }
  }
  return LOCAL_FALLBACK;
}
