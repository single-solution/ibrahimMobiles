const LOCAL_FALLBACK = "http://localhost:3000";

/**
 * Public storefront origin for SERP preview breadcrumbs and canonicals.
 *
 * Resolution order (first non-empty wins):
 *   1. `override` — admin-managed `StoreSettings.publicSiteUrl`. Pass it from
 *      a client component via `useStoreSettings()` so a non-engineer can
 *      change "View storefront" / SEO base without a deploy.
 *   2. Env vars — kept as a safety net so existing deploys keep working
 *      until the admin saves a value, and so server-only callers without
 *      access to settings (build-time SEO) still resolve sanely.
 *   3. `localhost:3000` — last-ditch dev fallback.
 */
export function getPublicSiteUrl(override?: string | null): string {
  const candidates = [
    override,
    process.env.NEXT_PUBLIC_STOREFRONT_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.STOREFRONT_BASE_URL,
    process.env.AUTH_URL,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim().replace(/\/$/, "");
    }
  }
  return LOCAL_FALLBACK;
}
