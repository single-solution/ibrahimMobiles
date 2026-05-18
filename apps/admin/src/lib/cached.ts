/**
 * Admin-app read caching.
 *
 * Admin pages are far less hot than the storefront (one operator per
 * tenant vs many concurrent visitors), but the dashboard alone fires
 * ~18 parallel Mongo round-trips, and list pages re-fetch the whole
 * catalog on every navigation. A short 15s cross-request cache makes
 * navigation between admin pages feel instant without compromising
 * freshness — every mutation route handler calls
 * `revalidateTag(ADMIN_CACHE_TAG)` to bust the layer immediately.
 *
 * Two tiers, identical to the storefront pattern:
 *
 *   1. React `cache()` — per-render dedupe. Used by lookups that
 *      `generateMetadata` and the page body both call (no metadata
 *      generators in admin today, but we set up the shape so future
 *      pages benefit automatically).
 *
 *   2. Next.js `unstable_cache` — cross-request dedupe. Used for the
 *      dashboard aggregation bundle and the catalog list reads.
 */
import { unstable_cache } from "next/cache";

import {
  loadDashboardDailyRevenue as loadDashboardDailyRevenueRaw,
  loadDashboardKpis as loadDashboardKpisRaw,
  loadDashboardRecentInquiries as loadDashboardRecentInquiriesRaw,
} from "@/lib/server/dashboardStats";

/** Tag for admin reads. Any admin mutation that should reflect
 *  immediately should call `revalidateTag(ADMIN_CACHE_TAG)`. */
export const ADMIN_CACHE_TAG = "admin";

/** Seconds the cross-request layer holds onto admin reads. Chosen so
 *  the dashboard feels live (numbers age at most by ~quarter-minute)
 *  while still saving ~95% of the underlying Mongo round-trips on a
 *  busy admin session. */
const ADMIN_CACHE_TTL_SECONDS = 15;

/**
 * Three independent cached loaders behind the dashboard.
 *
 * Splitting was deliberate: previously the page awaited one bundled
 * read with 18 parallel aggregations, which meant every Suspense
 * boundary on the dashboard had to wait for the slowest aggregation
 * before it could light up — even sections that only consumed a
 * 1-query slice. By exposing three independently-cached loaders the
 * recent-inquiries list (1 lightweight find) lights up first, the
 * daily-revenue sparklines (1 aggregation) light up next, and the
 * KPI grids (15 aggregations) light up when their pieces land. Total
 * Mongo work is unchanged — perceived load time isn't.
 *
 * Any admin mutation that should reflect immediately calls
 * `bustAdminCaches()` which flushes every tag at once.
 */

export const loadDashboardKpisCached = unstable_cache(
  () => loadDashboardKpisRaw(),
  ["admin-dashboard-kpis"],
  { revalidate: ADMIN_CACHE_TTL_SECONDS, tags: [ADMIN_CACHE_TAG] },
);

export const loadDashboardDailyRevenueCached = unstable_cache(
  () => loadDashboardDailyRevenueRaw(),
  ["admin-dashboard-daily-revenue"],
  { revalidate: ADMIN_CACHE_TTL_SECONDS, tags: [ADMIN_CACHE_TAG] },
);

export const loadDashboardRecentInquiriesCached = unstable_cache(
  () => loadDashboardRecentInquiriesRaw(),
  ["admin-dashboard-recent-inquiries"],
  { revalidate: ADMIN_CACHE_TTL_SECONDS, tags: [ADMIN_CACHE_TAG] },
);

import { revalidateTag } from "next/cache";

/** Tag for filter-independent storefront reads — duplicated from
 *  `apps/web/src/lib/storefront/cached.ts` so we can flush it from an
 *  admin mutation without cross-app importing. */
const STOREFRONT_CACHE_TAG = "storefront";

/**
 * Profile passed to `revalidateTag` in Next 16. Per Next.js docs, route
 * handlers (where we live) cannot use `updateTag` — they must call
 * `revalidateTag(tag, profile)` and `"max"` means "expire immediately
 * and revalidate on the next read", which is what we want after a
 * mutation.
 *
 * See: https://nextjs.org/docs/messages/revalidate-tag-single-arg
 */
const REVALIDATE_PROFILE = "max";

/**
 * Flush both the admin cache (dashboard, stats) and the storefront
 * cache (brand list, category list, product page) in one call.
 *
 * Call this from every mutation that changes a row a customer or
 * operator can see — products/brands/categories/orders/offers. The
 * 15s admin TTL is a worst-case safety net; this helper makes the
 * mutation feel instant to whoever just clicked "Save".
 */
export function bustAdminCaches(): void {
  revalidateTag(ADMIN_CACHE_TAG, REVALIDATE_PROFILE);
  revalidateTag(STOREFRONT_CACHE_TAG, REVALIDATE_PROFILE);
}
