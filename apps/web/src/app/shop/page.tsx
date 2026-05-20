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

/** Fallback target when the categories collection is empty / unreadable.
 *  Resolves at runtime — Phase 1 has no hardcoded category slugs. We
 *  redirect to the home page so the visitor never lands on a 404 even
 *  when admin hasn't created any categories yet. */
const FALLBACK_REDIRECT = "/";

/**
 * `/shop` is a redirector — it forwards the visitor to the first active
 * category's listing. With Phase 1's dynamic catalog there are no
 * hardcoded categories, so the fallback simply sends visitors home if
 * admin hasn't created any categories yet.
 *
 * Build-time resilience: if the categories read fails (Mongo unreachable
 * during prerender), we redirect to the fallback. ISR cycles will retry
 * the read, so the fallback is only ever served briefly.
 */
export default async function ShopIndexPage() {
  let redirectTo = FALLBACK_REDIRECT;
  try {
    const categories = await getStorefrontCategoriesCached();
    const first = categories.find((category) => category.isActive);
    if (first) {
      redirectTo = `/shop/${first.slug}`;
    }
  } catch (error) {
    logger.error(
      { error },
      `shop: categories load failed, redirecting to ${FALLBACK_REDIRECT}`,
    );
  }
  redirect(redirectTo);
}
