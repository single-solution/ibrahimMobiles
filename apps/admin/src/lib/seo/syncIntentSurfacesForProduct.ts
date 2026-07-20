import { connectDB, Product } from "@store/db";
import { isVariantInStock, type IntentSurfaceKey } from "@store/shared";

import { regenerateIntentSurface } from "@/lib/seo/regenerateIntentSurface";

/** Refresh intent surfaces for every in-stock grade on a product after catalog drift. */
export async function syncIntentSurfacesForProduct(productId: string): Promise<void> {
	await connectDB();
	const doc = await Product.findById(productId).select({ categorySlug: 1, brandSlug: 1, variants: 1 }).lean<{
		categorySlug: string;
		brandSlug: string;
		variants: Array<{ gradeSlug: string; quantity?: number; forceOutOfStock?: boolean }>;
	}>();
	if (!doc) {
		return;
	}

	const gradeSlugs = new Set<string>();
	for (const variant of doc.variants ?? []) {
		if (isVariantInStock(variant)) {
			gradeSlugs.add(variant.gradeSlug);
		}
	}

	const keys: IntentSurfaceKey[] = Array.from(gradeSlugs).map((gradeSlug) => ({
		categorySlug: doc.categorySlug,
		brandSlug: doc.brandSlug,
		gradeSlug,
	}));

	await Promise.all(keys.map((key) => regenerateIntentSurface(key)));
}
