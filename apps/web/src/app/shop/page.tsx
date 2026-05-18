import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { logger } from "@store/shared";

import {
  getStoreSettingsCached,
  getStorefrontCategoriesCached,
} from "@/lib/storefront/cached";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getStoreSettingsCached();
  return {
    title: "Shop",
    description: `Browse ${siteName} by category — phones, accessories, and gadgets. Every item graded by condition.`,
  };
}

// Categories are admin-managed but change at human pace (rarely). Cache
// the redirect target for 5 minutes so /shop costs a static read instead
// of a fresh Mongo round-trip on every navigation.
export const revalidate = 300;

/** Fallback target when the categories collection is unreadable. `phones`
 *  is the default category seeded by `packages/db` and renders correctly
 *  even when its DB row hasn't loaded yet, so this redirect always
 *  produces a valid landing page. */
const DEFAULT_CATEGORY_PATH_SEGMENT = "phones";

/**
 * `/shop` is a redirector — it forwards the visitor to the first active
 * category's listing (defaulting to phones if none is configured). The
 * in-page category selector then lets them switch sections without a
 * second navigation hop.
 *
 * Build-time resilience: if the categories read fails (Mongo unreachable
 * during prerender), we redirect to the default category. ISR cycles
 * will retry the read, so the fallback is only ever served briefly.
 */
export default async function ShopIndexPage() {
  let pathSegment = DEFAULT_CATEGORY_PATH_SEGMENT;
  try {
    const categories = await getStorefrontCategoriesCached();
    const first = categories.find((category) => category.isActive);
    if (first) {
      pathSegment = first.pathSegment;
    }
  } catch (error) {
    logger.error(
      { error },
      `shop: categories load failed, redirecting to /${DEFAULT_CATEGORY_PATH_SEGMENT}`,
    );
  }
  redirect(`/shop/${pathSegment}`);
}
