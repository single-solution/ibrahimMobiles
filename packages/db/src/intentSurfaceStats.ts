import type { PipelineStage } from "mongoose";
import type { IntentSurfaceComboStats, IntentSurfaceKey } from "@store/shared";
import { INTENT_SURFACE_ELIGIBILITY } from "@store/shared";

import { connectDB } from "./connection";
import { Brand } from "./models/Brand";
import { Category } from "./models/Category";
import { Product } from "./models/Product";

const PUBLIC_PRODUCT_FILTER = {
	isActive: true,
	isArchived: { $ne: true },
	"variants.0": { $exists: true },
} as const;

const IN_STOCK_VARIANT_MATCH = {
	"variants.quantity": { $gt: 0 },
	$or: [{ "variants.forceOutOfStock": { $exists: false } }, { "variants.forceOutOfStock": { $ne: true } }],
};

async function buildVisibilityMatch(): Promise<Record<string, unknown>> {
	const [categories, hiddenBrands] = await Promise.all([
		Category.find({ isActive: true }).select("slug").lean<Array<{ slug: string }>>(),
		Brand.find({ isActive: false }).select("slug categorySlugs").lean<Array<{ slug: string; categorySlugs: string[] }>>(),
	]);
	const match: Record<string, unknown> = { ...PUBLIC_PRODUCT_FILTER };
	const andClauses: Record<string, unknown>[] = [{ categorySlug: { $in: categories.map((category) => category.slug) } }];
	const hiddenPairs = hiddenBrands.flatMap((brand) =>
		(brand.categorySlugs ?? []).map((categorySlug) => ({
			categorySlug,
			brandSlug: brand.slug,
		})),
	);
	if (hiddenPairs.length > 0) {
		andClauses.push({
			$nor: hiddenPairs.map((pair) => ({
				categorySlug: pair.categorySlug,
				brandSlug: pair.brandSlug,
			})),
		});
	}
	match.$and = andClauses;
	return match;
}

function mapComboRow(row: {
	_id: { categorySlug: string; brandSlug: string; gradeSlug: string };
	productCount: number;
	inStockVariantCount: number;
	minPriceRupees?: number;
	maxPriceRupees?: number;
}): IntentSurfaceComboStats {
	return {
		categorySlug: row._id.categorySlug,
		brandSlug: row._id.brandSlug,
		gradeSlug: row._id.gradeSlug,
		productCount: row.productCount,
		inStockVariantCount: row.inStockVariantCount,
		minPriceRupees: row.minPriceRupees,
		maxPriceRupees: row.maxPriceRupees,
	};
}

const COMBO_GROUP_PIPELINE: PipelineStage[] = [
	{ $unwind: "$variants" },
	{ $match: IN_STOCK_VARIANT_MATCH },
	{
		$group: {
			_id: {
				categorySlug: "$categorySlug",
				brandSlug: "$brandSlug",
				gradeSlug: "$variants.gradeSlug",
				productId: "$_id",
			},
			minPriceRupees: { $min: "$variants.priceRupees" },
			maxPriceRupees: { $max: "$variants.priceRupees" },
		},
	},
	{
		$group: {
			_id: {
				categorySlug: "$_id.categorySlug",
				brandSlug: "$_id.brandSlug",
				gradeSlug: "$_id.gradeSlug",
			},
			productCount: { $sum: 1 },
			inStockVariantCount: { $sum: 1 },
			minPriceRupees: { $min: "$minPriceRupees" },
			maxPriceRupees: { $max: "$maxPriceRupees" },
		},
	},
];

export async function aggregateIntentSurfaceComboStats(key: IntentSurfaceKey): Promise<IntentSurfaceComboStats | null> {
	await connectDB();
	const visibilityMatch = await buildVisibilityMatch();
	const rows = await Product.aggregate<{
		_id: { categorySlug: string; brandSlug: string; gradeSlug: string };
		productCount: number;
		inStockVariantCount: number;
		minPriceRupees?: number;
		maxPriceRupees?: number;
	}>([
		{
			$match: {
				...visibilityMatch,
				categorySlug: key.categorySlug,
				brandSlug: key.brandSlug,
			},
		},
		...COMBO_GROUP_PIPELINE,
		{ $match: { "_id.gradeSlug": key.gradeSlug } },
		{ $limit: 1 },
	]);

	const row = rows[0];
	if (!row) {
		return {
			categorySlug: key.categorySlug,
			brandSlug: key.brandSlug,
			gradeSlug: key.gradeSlug,
			productCount: 0,
			inStockVariantCount: 0,
		};
	}
	return mapComboRow(row);
}

export async function listEligibleIntentSurfaceCombos(): Promise<IntentSurfaceComboStats[]> {
	await connectDB();
	const visibilityMatch = await buildVisibilityMatch();
	const rows = await Product.aggregate<{
		_id: { categorySlug: string; brandSlug: string; gradeSlug: string };
		productCount: number;
		inStockVariantCount: number;
		minPriceRupees?: number;
		maxPriceRupees?: number;
	}>([
		{ $match: visibilityMatch },
		...COMBO_GROUP_PIPELINE,
		{
			$match: {
				productCount: { $gte: INTENT_SURFACE_ELIGIBILITY.minProducts },
				inStockVariantCount: { $gte: INTENT_SURFACE_ELIGIBILITY.minInStockVariants },
			},
		},
		{ $sort: { inStockVariantCount: -1, productCount: -1 } },
	]);

	return rows.map(mapComboRow);
}
