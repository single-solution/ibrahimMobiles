const LOCAL_FALLBACK = "http://localhost:3000";

/**
 * Canonical public storefront origin.
 *
 * Resolution order (first non-empty wins):
 *   1. `override` — admin-managed `StoreSettings.publicSiteUrl`
 *   2. `STOREFRONT_BASE_URL` / `NEXT_PUBLIC_STOREFRONT_URL` / `NEXT_PUBLIC_SITE_URL`
 *   3. `localhost:3000` — last-resort **dev** fallback
 *
 * Intentionally does NOT use `AUTH_URL` or `VERCEL_PROJECT_PRODUCTION_URL` —
 * on the admin deploy those are the admin origin, not the shop.
 */
export function resolvePublicSiteUrl(override?: string | null): string {
	const candidates = [
		override,
		process.env.STOREFRONT_BASE_URL,
		process.env.NEXT_PUBLIC_STOREFRONT_URL,
		process.env.NEXT_PUBLIC_SITE_URL,
	];
	for (const candidate of candidates) {
		if (typeof candidate === "string" && candidate.trim().length > 0) {
			return candidate.trim().replace(/\/$/, "");
		}
	}
	return LOCAL_FALLBACK;
}

/** True when the resolved origin is only the local/dev fallback (misconfigured for production). */
export function isLocalPublicSiteUrlFallback(url: string): boolean {
	const normalized = url.trim().replace(/\/$/, "").toLowerCase();
	return normalized === LOCAL_FALLBACK || normalized.startsWith("http://localhost:") || normalized.startsWith("http://127.0.0.1:");
}
