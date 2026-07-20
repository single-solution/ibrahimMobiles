import { unstable_cache } from "next/cache";

import { buildMerchantFeedRows, type MerchantFeedRow } from "@store/shared";

import { getAttributesCached, getGradesCached, STOREFRONT_CACHE_TAG } from "@/lib/core/cached";
import { getAllPublicProductsForFeed } from "@/lib/core/queries";
import { getSeoSettings } from "@/lib/seo/seoSettings";

const loadMerchantFeedRowsInner = unstable_cache(
	async (): Promise<MerchantFeedRow[]> => {
		const [products, grades, attributes, seoSettings] = await Promise.all([
			getAllPublicProductsForFeed(),
			getGradesCached(),
			getAttributesCached(),
			getSeoSettings(),
		]);
		return buildMerchantFeedRows({
			products,
			grades,
			attributes,
			siteUrl: seoSettings.siteUrl,
			storeName: seoSettings.seoStoreName.trim() || seoSettings.siteName,
		});
	},
	["storefront-merchant-feed"],
	{ revalidate: 3600, tags: [STOREFRONT_CACHE_TAG] },
);

export function getMerchantFeedRowsCached(): Promise<MerchantFeedRow[]> {
	return loadMerchantFeedRowsInner();
}
