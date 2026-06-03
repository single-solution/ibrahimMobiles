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
import type { Types } from "mongoose";

import {
  ActivityEntry,
  Brand,
  Customer,
  connectDB,
  Inquiry,
  LoyaltyAccount,
  Offer,
  Order,
  Product,
  User,
} from "@store/db";
import { LOYALTY_POINT_TO_RUPEE } from "@store/shared";

import {
  loadDashboardDailyRevenue as loadDashboardDailyRevenueRaw,
  loadDashboardKpis as loadDashboardKpisRaw,
  loadDashboardRecentInquiries as loadDashboardRecentInquiriesRaw,
  loadPerformanceSummary as loadPerformanceSummaryRaw,
} from "@/lib/server/dashboardStats";
import type {
  PerformanceCompare,
  PerformanceRange,
} from "@/lib/dashboard/performancePeriod";
import { loadShopHealth as loadShopHealthRaw } from "@/lib/server/shopHealth";
import {
  loadProductWizardCatalog as loadProductWizardCatalogRaw,
  type ProductWizardCatalog,
} from "@/lib/products/loadProductWizardCatalog";
import { toActivityResponse, type ActivityEntryLean } from "@/lib/serializers/activity";
import { type BrandLean } from "@/lib/serializers/brand";
import { toCustomerResponse, type CustomerLean } from "@/lib/serializers/customer";
import { summariseInquiry, type InquiryLean } from "@/lib/serializers/inquiry";
import { toOfferResponse, type OfferLean } from "@/lib/serializers/offer";
import { summariseOrder, type OrderLean } from "@/lib/serializers/order";
import {
  brandLookupKey,
  summariseProduct,
  type ProductLean,
} from "@/lib/serializers/product";
import { toUserResponse, type UserLean } from "@/lib/serializers/user";
import type {
  AdminActivityEntry,
  AdminCustomerSummary,
  AdminInquirySummary,
  AdminOffer,
  AdminOrderSummary,
  AdminProductSummary,
  AdminUser,
} from "@/types/models";

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

/**
 * Period-aware performance summary cache. The cache key includes the
 * range + compare arguments so each (range, compare) tuple gets its
 * own slot. Same 15s TTL as the rest of the dashboard.
 */
export const loadPerformanceSummaryCached = unstable_cache(
  async (range: PerformanceRange, compare: PerformanceCompare) =>
    loadPerformanceSummaryRaw({ range, compare }),
  ["admin-dashboard-performance-summary"],
  { revalidate: ADMIN_CACHE_TTL_SECONDS, tags: [ADMIN_CACHE_TAG] },
);

/** Shop health card — settings + catalog hygiene + stock readiness. */
export const loadShopHealthCached = unstable_cache(
  () => loadShopHealthRaw(),
  ["admin-dashboard-shop-health"],
  { revalidate: ADMIN_CACHE_TTL_SECONDS, tags: [ADMIN_CACHE_TAG] },
);

import { revalidateTag } from "next/cache";

/** Tag for filter-independent storefront reads — duplicated from
 *  `apps/web/src/lib/core/cached.ts` so we can flush it from an
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

// ────────────────────────────────────────────────────────────────
// Admin list page loaders (cached)
//
// Every list page (products / orders / customers / inquiries / team /
// offers / activity) used to re-run its Mongo find on every visit —
// even a sidebar click already showing the data in the router cache.
// Wrapping the find + serializer in `unstable_cache` makes repeat
// admin navigation effectively free for 15s, and the existing
// `bustAdminCaches()` calls in mutation routes flush these tags
// alongside the dashboard ones.
// ────────────────────────────────────────────────────────────────

const ADMIN_PRODUCTS_LIST_LIMIT_DEFAULT = 0;
const ADMIN_ORDERS_LIST_LIMIT = 200;
const ADMIN_CUSTOMERS_LIST_LIMIT = 500;
const ADMIN_INQUIRIES_LIST_LIMIT = 200;
const ADMIN_OFFERS_LIST_LIMIT = 200;
const ADMIN_ACTIVITY_LIST_LIMIT = 200;

interface OrderStatsRow {
  _id: Types.ObjectId;
  orderCount: number;
  lifetimeSpendRupees: number;
  lastOrderAt: Date;
}

interface LoyaltyAccountStatsRow {
  customerId: Types.ObjectId;
  balance: number;
  lifetimeEarned: number;
}

export const loadAdminProductsCached = unstable_cache(
  async (): Promise<{
    products: AdminProductSummary[];
    catalog: ProductWizardCatalog;
  }> => {
    await connectDB();
    const productsQuery = Product.find({ isArchived: { $ne: true } })
      .sort({ createdAt: -1 });
    if (ADMIN_PRODUCTS_LIST_LIMIT_DEFAULT > 0) {
      productsQuery.limit(ADMIN_PRODUCTS_LIST_LIMIT_DEFAULT);
    }
    const [productDocs, brandDocs, catalog] = await Promise.all([
      productsQuery.lean<ProductLean[]>(),
      Brand.find().lean<BrandLean[]>(),
      loadProductWizardCatalogRaw(),
    ]);
    const brandsByCategoryAndSlug = new Map(
      brandDocs.flatMap((brand) =>
        brand.categorySlugs.map(
          (categorySlug) =>
            [brandLookupKey(categorySlug, brand.slug), brand] as const,
        ),
      ),
    );
    const products = productDocs.map((doc) =>
      summariseProduct(doc, brandsByCategoryAndSlug),
    );
    return { products, catalog };
  },
  ["admin-products-list"],
  { revalidate: ADMIN_CACHE_TTL_SECONDS, tags: [ADMIN_CACHE_TAG] },
);

export const loadAdminOrdersCached = unstable_cache(
  async (): Promise<AdminOrderSummary[]> => {
    await connectDB();
    const docs = await Order.find()
      .sort({ placedAt: -1 })
      .limit(ADMIN_ORDERS_LIST_LIMIT)
      .lean<OrderLean[]>();
    return docs.map(summariseOrder);
  },
  ["admin-orders-list"],
  { revalidate: ADMIN_CACHE_TTL_SECONDS, tags: [ADMIN_CACHE_TAG] },
);

export const loadAdminCustomersCached = unstable_cache(
  async (): Promise<AdminCustomerSummary[]> => {
    await connectDB();
    const docs = await Customer.find()
      .sort({ createdAt: -1 })
      .limit(ADMIN_CUSTOMERS_LIST_LIMIT)
      .lean<CustomerLean[]>();
    const customerIds = docs.map((customer) => customer._id);
    const [stats, loyaltyDocs] = await Promise.all([
      Order.aggregate<OrderStatsRow>([
        { $match: { customerId: { $in: customerIds } } },
        {
          $group: {
            _id: "$customerId",
            orderCount: { $sum: 1 },
            lifetimeSpendRupees: { $sum: "$totals.totalRupees" },
            lastOrderAt: { $max: "$placedAt" },
          },
        },
      ]),
      LoyaltyAccount.find({ customerId: { $in: customerIds } })
        .select({ customerId: 1, balance: 1, lifetimeEarned: 1 })
        .lean<LoyaltyAccountStatsRow[]>(),
    ]);
    const statsMap = new Map(
      stats.map((stat) => [
        stat._id.toString(),
        {
          orderCount: stat.orderCount,
          lifetimeSpendRupees: stat.lifetimeSpendRupees,
          lastOrderAt: stat.lastOrderAt,
        },
      ]),
    );
    const loyaltyByCustomerId = new Map(
      loyaltyDocs.map((account) => [
        account.customerId.toString(),
        {
          balance: account.balance ?? 0,
          lifetimeEarned: account.lifetimeEarned ?? 0,
        },
      ]),
    );
    return docs.map((customer) => {
      const stat = statsMap.get(customer._id.toString()) ?? {
        orderCount: 0,
        lifetimeSpendRupees: 0,
        lastOrderAt: undefined,
      };
      const full = toCustomerResponse(customer, stat);
      const loyalty = loyaltyByCustomerId.get(customer._id.toString());
      return {
        id: full.id,
        name: full.name,
        email: full.email,
        phoneNumber: full.phoneNumber,
        city: full.city,
        isLoyaltyMember: full.isLoyaltyMember,
        loyaltyBalance: loyalty?.balance ?? 0,
        loyaltyLifetimeEarned: loyalty?.lifetimeEarned ?? 0,
        orderCount: full.orderCount,
        lifetimeSpendRupees: full.lifetimeSpendRupees,
        lastOrderAt: full.lastOrderAt,
        createdAt: full.createdAt,
        updatedAt: full.updatedAt,
      };
    });
  },
  ["admin-customers-list"],
  { revalidate: ADMIN_CACHE_TTL_SECONDS, tags: [ADMIN_CACHE_TAG] },
);

/** Exposed so callers can format the customers page consistently. */
export const ADMIN_LOYALTY_POINT_TO_RUPEE = LOYALTY_POINT_TO_RUPEE;

export const loadAdminInquiriesCached = unstable_cache(
  async (): Promise<AdminInquirySummary[]> => {
    await connectDB();
    const docs = await Inquiry.find()
      .sort({ lastMessageAt: -1 })
      .limit(ADMIN_INQUIRIES_LIST_LIMIT)
      .lean<InquiryLean[]>();
    return docs.map(summariseInquiry);
  },
  ["admin-inquiries-list"],
  { revalidate: ADMIN_CACHE_TTL_SECONDS, tags: [ADMIN_CACHE_TAG] },
);

export const loadAdminTeamCached = unstable_cache(
  async (): Promise<AdminUser[]> => {
    await connectDB();
    const docs = await User.find().sort({ name: 1 }).lean<UserLean[]>();
    return docs.map(toUserResponse);
  },
  ["admin-team-list"],
  { revalidate: ADMIN_CACHE_TTL_SECONDS, tags: [ADMIN_CACHE_TAG] },
);

export const loadAdminOffersCached = unstable_cache(
  async (): Promise<AdminOffer[]> => {
    await connectDB();
    const docs = await Offer.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(ADMIN_OFFERS_LIST_LIMIT)
      .lean<OfferLean[]>();
    return docs.map(toOfferResponse);
  },
  ["admin-offers-list"],
  { revalidate: ADMIN_CACHE_TTL_SECONDS, tags: [ADMIN_CACHE_TAG] },
);

export const loadAdminActivityCached = unstable_cache(
  async (): Promise<AdminActivityEntry[]> => {
    await connectDB();
    const docs = await ActivityEntry.find()
      .sort({ createdAt: -1 })
      .limit(ADMIN_ACTIVITY_LIST_LIMIT)
      .lean<ActivityEntryLean[]>();
    return docs.map(toActivityResponse);
  },
  ["admin-activity-list"],
  { revalidate: ADMIN_CACHE_TTL_SECONDS, tags: [ADMIN_CACHE_TAG] },
);
