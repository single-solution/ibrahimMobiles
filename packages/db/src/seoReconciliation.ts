import {
	buildIntentSurfaceKey,
	passesIntentSurfaceEligibility,
	type IntentSurfaceComboStats,
	type IntentSurfaceKey,
} from "@store/shared";

import { aggregateIntentSurfaceComboStats, listEligibleIntentSurfaceCombos } from "./intentSurfaceStats";
import { connectDB } from "./connection";
import { SeoSurface } from "./models/SeoSurface";

export interface SeoReconcileResult {
	updated: number;
	indexable: number;
	deindexed: number;
}

/** True when an eligible category x brand x grade intent surface exists for this brand. */
export async function categoryBrandHasEligibleGradeIntent(categorySlug: string, brandSlug: string): Promise<boolean> {
	const combos = await listEligibleIntentSurfaceCombos();
	return combos.some((combo) => combo.categorySlug === categorySlug && combo.brandSlug === brandSlug);
}

/** Intent surfaces that are both live-eligible and marked indexable in the DB. */
export async function listIndexableIntentSurfacesForSitemap(): Promise<IntentSurfaceComboStats[]> {
	await connectDB();
	const [eligible, indexableDocs] = await Promise.all([
		listEligibleIntentSurfaceCombos(),
		SeoSurface.find({ isIndexable: true }).select({ categorySlug: 1, brandSlug: 1, gradeSlug: 1 }).lean(),
	]);
	const indexableKeys = new Set(indexableDocs.map((doc) => buildIntentSurfaceKey(doc)));
	return eligible.filter((combo) => indexableKeys.has(buildIntentSurfaceKey(combo)));
}

async function refreshSeoSurfaceStats(key: IntentSurfaceKey): Promise<boolean> {
	const stats = await aggregateIntentSurfaceComboStats(key);
	if (!stats) {
		return false;
	}

	const existing = await SeoSurface.findOne({
		categorySlug: key.categorySlug,
		brandSlug: key.brandSlug,
		gradeSlug: key.gradeSlug,
	})
		.select({ title: 1, description: 1, intro: 1, headlineOverride: 1, introOverride: 1 })
		.lean();

	const hasCopy = Boolean(
		existing?.title?.trim() &&
			existing.description?.trim() &&
			(existing.intro?.trim() || existing.headlineOverride?.trim() || existing.introOverride?.trim()),
	);
	const isIndexable = passesIntentSurfaceEligibility(stats, hasCopy);

	await SeoSurface.updateOne(
		{
			categorySlug: key.categorySlug,
			brandSlug: key.brandSlug,
			gradeSlug: key.gradeSlug,
		},
		{
			$set: {
				inStockVariantCount: stats.inStockVariantCount,
				productCount: stats.productCount,
				minPriceRupees: stats.minPriceRupees,
				maxPriceRupees: stats.maxPriceRupees,
				isIndexable,
				lastStockCheckAt: new Date(),
			},
		},
	);

	return isIndexable;
}

/** Refresh stats and index flags for all known intent surfaces; deindex stale combos. */
export async function reconcileAllSeoSurfaces(): Promise<SeoReconcileResult> {
	await connectDB();

	const [eligible, existingDocs] = await Promise.all([
		listEligibleIntentSurfaceCombos(),
		SeoSurface.find({}).select({ categorySlug: 1, brandSlug: 1, gradeSlug: 1, isIndexable: 1 }).lean(),
	]);

	const eligibleKeys = new Set(eligible.map((combo) => buildIntentSurfaceKey(combo)));
	let updated = 0;
	let indexable = 0;

	for (const combo of eligible) {
		const isIndexable = await refreshSeoSurfaceStats(combo);
		updated += 1;
		if (isIndexable) {
			indexable += 1;
		}
	}

	let deindexed = 0;
	for (const doc of existingDocs) {
		const key = buildIntentSurfaceKey(doc);
		if (eligibleKeys.has(key)) {
			continue;
		}
		if (doc.isIndexable) {
			deindexed += 1;
		}
		await SeoSurface.updateOne(
			{ categorySlug: doc.categorySlug, brandSlug: doc.brandSlug, gradeSlug: doc.gradeSlug },
			{ $set: { isIndexable: false, lastStockCheckAt: new Date() } },
		);
		updated += 1;
	}

	return { updated, indexable, deindexed };
}
