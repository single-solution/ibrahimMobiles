import type { Metadata } from "next";
import { redirect } from "next/navigation";
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

/**
 * `/shop` is a redirector — it forwards the visitor to the first active
 * category's listing (defaulting to phones if none is configured). The
 * in-page category selector then lets them switch sections without a
 * second navigation hop.
 */
export default async function ShopIndexPage() {
  const categories = await getStorefrontCategoriesCached();
  const first = categories.find((category) => category.isActive);
  redirect(`/shop/${first?.pathSegment ?? "phones"}`);
}
