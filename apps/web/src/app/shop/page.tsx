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
    description: `Browse ${siteName} by category. Every item graded by condition.`,
  };
}

export const revalidate = 300;

const FALLBACK_REDIRECT = "/";

/**
 * `/shop` — redirects to the first active category (catalog sort order).
 */
export default async function ShopIndexPage() {
  let categories: Awaited<ReturnType<typeof getStorefrontCategoriesCached>> = [];
  try {
    categories = await getStorefrontCategoriesCached();
  } catch (error) {
    logger.error(
      { error },
      `shop: categories load failed, redirecting to ${FALLBACK_REDIRECT}`,
    );
    redirect(FALLBACK_REDIRECT);
  }

  const firstActive = categories.find((category) => category.isActive);

  if (!firstActive) {
    redirect(FALLBACK_REDIRECT);
  }

  redirect(`/shop/${firstActive.slug}`);
}
