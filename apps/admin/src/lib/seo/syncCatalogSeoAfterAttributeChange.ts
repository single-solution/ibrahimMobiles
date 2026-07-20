import { Attribute, connectDB, Product } from "@store/db";
import { logger } from "@store/shared";

import { regenerateProductSeo } from "@/lib/seo/regenerateProductSeo";

/** Regenerate product SEO for every product that uses an attribute after glossary copy changes. */
export async function syncCatalogSeoAfterAttributeChange(attributeId: string): Promise<void> {
	await connectDB();
	const attribute = await Attribute.findById(attributeId).select({ categorySlug: 1, slug: 1 }).lean<{ categorySlug: string; slug: string }>();
	if (!attribute) {
		return;
	}

	const products = await Product.find({
		categorySlug: attribute.categorySlug,
		attributeSlugs: attribute.slug,
	})
		.select({ _id: 1 })
		.lean<Array<{ _id: { toString(): string } }>>();

	const results = await Promise.allSettled(products.map((product) => regenerateProductSeo(product._id.toString())));

	for (const result of results) {
		if (result.status === "rejected") {
			logger.warn({ error: result.reason, attributeId }, "attribute-seo-cascade: partial failure");
		}
	}
}
