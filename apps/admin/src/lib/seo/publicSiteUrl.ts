const LOCAL_FALLBACK = "http://localhost:3000";

/** Public storefront origin for SERP preview breadcrumbs and canonicals. */
export function getPublicSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_STOREFRONT_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.STOREFRONT_BASE_URL,
    process.env.AUTH_URL,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate.replace(/\/$/, "");
    }
  }
  return LOCAL_FALLBACK;
}
