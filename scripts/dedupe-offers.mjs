/**
 * Remove catalog-overlapping offers. Keeps lowest sortOrder per exclusivity rules;
 * checkout-only offers (cart total, payment method) are always kept.
 *
 *   node scripts/dedupe-offers.mjs --dry-run
 *   node scripts/dedupe-offers.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

import { findOfferCatalogScopeConflict, offerHasCatalogItemScope } from "../packages/shared/src/pricing/offerScope.ts";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envLocalPath = resolve(scriptDir, "../.env.local");
const isDryRun = process.argv.includes("--dry-run");

if (!process.env.MONGODB_URI && existsSync(envLocalPath)) {
	for (const line of readFileSync(envLocalPath, "utf8").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#") || !trimmed.startsWith("MONGODB_URI=")) {
			continue;
		}
		process.env.MONGODB_URI = trimmed.slice("MONGODB_URI=".length).trim();
		break;
	}
}

const uri = process.env.MONGODB_URI;
if (!uri) {
	console.error("MONGODB_URI is not set.");
	process.exit(1);
}

function toCatalogProduct(row) {
	return {
		id: row._id.toString(),
		name: row.name,
		categorySlug: row.categorySlug,
		brandSlug: row.brandSlug,
		variants: (row.variants ?? []).map((variant) => ({
			gradeSlug: variant.gradeSlug,
			attributes: variant.attributes ?? {},
		})),
	};
}

async function main() {
	await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
	const db = mongoose.connection.db;

	const offerRows = await db.collection("offers").find({}).sort({ sortOrder: 1, createdAt: 1 }).toArray();
	const productRows = await db
		.collection("products")
		.find({ isArchived: { $ne: true } })
		.project({ name: 1, categorySlug: 1, brandSlug: 1, variants: 1 })
		.toArray();

	const products = productRows.map(toCatalogProduct);
	const offers = offerRows.map((row) => ({
		id: row._id.toString(),
		title: row.title,
		sortOrder: row.sortOrder ?? 0,
		conditions: row.conditions ?? [],
	}));

	const kept = [];
	const toDelete = [];

	for (const offer of offers) {
		if (!offerHasCatalogItemScope(offer.conditions)) {
			kept.push(offer);
			continue;
		}

		const conflict = findOfferCatalogScopeConflict(offer.conditions, kept, products);
		if (conflict) {
			toDelete.push({ offer, conflict });
			continue;
		}

		kept.push(offer);
	}

	console.log(`Offers: ${offers.length} | keep: ${kept.length} | remove: ${toDelete.length}`);
	for (const offer of kept) {
		console.log(`  keep  [${offer.sortOrder}] ${offer.title}`);
	}
	for (const { offer, conflict } of toDelete) {
		console.log(`  drop  [${offer.sortOrder}] ${offer.title} — overlaps "${conflict.conflictingOfferTitle}" (${conflict.productName})`);
	}

	if (toDelete.length === 0) {
		console.log("\nNo overlapping catalog offers.");
		await mongoose.disconnect();
		return;
	}

	if (isDryRun) {
		console.log(`\nDry run: would delete ${toDelete.length} offer(s).`);
		await mongoose.disconnect();
		return;
	}

	const ids = toDelete.map(({ offer }) => new mongoose.Types.ObjectId(offer.id));
	const result = await db.collection("offers").deleteMany({ _id: { $in: ids } });
	console.log(`\nDeleted ${result.deletedCount} offer(s).`);
	await mongoose.disconnect();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
