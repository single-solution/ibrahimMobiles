import { connectDB, Grade, Product } from "@store/db";
import { logger } from "@store/shared";

import { regenerateIntentSurface } from "@/lib/seo/regenerateIntentSurface";
import { regenerateProductSeo } from "@/lib/seo/regenerateProductSeo";

/** Regenerate product SEO and intent surfaces after grade copy or slug changes. */
export async function syncCatalogSeoAfterGradeChange(gradeId: string): Promise<void> {
	await connectDB();
	const grade = await Grade.findById(gradeId).select({ categorySlug: 1, slug: 1 }).lean<{ categorySlug: string; slug: string }>();
	if (!grade) {
		return;
	}

	const products = await Product.find({
		categorySlug: grade.categorySlug,
		variants: { $elemMatch: { gradeSlug: grade.slug } },
	})
		.select({ _id: 1, brandSlug: 1 })
		.lean<Array<{ _id: { toString(): string }; brandSlug: string }>>();

	const brandSlugs = [...new Set(products.map((product) => product.brandSlug).filter(Boolean))];
	const productIds = products.map((product) => product._id.toString());

	const results = await Promise.allSettled([
		...productIds.map((productId) => regenerateProductSeo(productId)),
		...brandSlugs.map((brandSlug) =>
			regenerateIntentSurface({ categorySlug: grade.categorySlug, brandSlug, gradeSlug: grade.slug }, undefined, {
				forceRegenerateCopy: true,
			}),
		),
	]);

	for (const result of results) {
		if (result.status === "rejected") {
			logger.warn({ error: result.reason, gradeId }, "grade-seo-cascade: partial failure");
		}
	}
}
