import {
	type ActiveOffer,
	type Offer,
	type Product,
	toActiveOffer,
	hasItemScopeConditions,
} from "@store/shared";

import { getProductsPage, getOffers } from "@/lib/core/queries";
import type { OfferLean } from "@/lib/core/serializers";
import { connectDB, Offer as OfferModel } from "@store/db";

import {
	filterProductsForOffer,
	productHasAnyStorefrontOffer,
	resolveSpotlightVariant,
	resolveVariantOfferBadgeLabel,
} from "./productOfferMatch";

export type DealsOfferSection = {
	offer: Offer;
	activeOffer: ActiveOffer;
	products: Product[];
};

export type DealsPageContent = {
	spotlight: Product | null;
	spotlightOfferBadgeLabel: string | null;
	sections: DealsOfferSection[];
};

const PRODUCT_POOL_LIMIT = 120;
const PRODUCTS_PER_SECTION = 8;
const SPOTLIGHT_CANDIDATE_LIMIT = 16;

async function getActiveOfferDocs(): Promise<ActiveOffer[]> {
	await connectDB();
	const now = new Date();
	const docs = await OfferModel.find({
		isActive: true,
		$and: [
			{
				$or: [
					{ "schedule.startDate": { $exists: false } },
					{ "schedule.startDate": null },
					{ "schedule.startDate": { $lte: now } },
				],
			},
			{
				$or: [
					{ "schedule.endDate": { $exists: false } },
					{ "schedule.endDate": null },
					{ "schedule.endDate": { $gt: now } },
				],
			},
		],
	})
		.sort({ sortOrder: 1, createdAt: -1 })
		.lean<OfferLean[]>();

	return docs.map(toActiveOffer);
}

function resolveSpotlightProduct(
	featuredCandidates: Product[],
	activeOffers: ActiveOffer[],
): Product | null {
	for (const product of featuredCandidates) {
		if (productHasAnyStorefrontOffer(product, activeOffers)) {
			return product;
		}
	}
	return featuredCandidates[0] ?? null;
}

/** Spotlight + offer-anchored product rails for `/deals`. */
export async function loadDealsPageContent(): Promise<DealsPageContent> {
	const [displayOffers, activeOffers, productPool, featuredPage] = await Promise.all([
		getOffers(),
		getActiveOfferDocs(),
		getProductsPage({
			inStockOnly: true,
			limit: PRODUCT_POOL_LIMIT,
			page: 1,
			sort: "recently-updated",
		}),
		getProductsPage({
			isFeatured: true,
			inStockOnly: true,
			limit: SPOTLIGHT_CANDIDATE_LIMIT,
			page: 1,
			sort: "recently-updated",
		}),
	]);

	const spotlight = resolveSpotlightProduct(featuredPage.products, activeOffers);
	const spotlightVariant = spotlight ? resolveSpotlightVariant(spotlight) : null;
	const spotlightOfferBadgeLabel =
		spotlight && spotlightVariant
			? resolveVariantOfferBadgeLabel(spotlight, spotlightVariant, activeOffers)
			: null;

	const usedProductIds = new Set<string>(spotlight ? [spotlight.id] : []);

	const activeById = new Map(activeOffers.map((offer) => [offer.id, offer]));

	const sections: DealsOfferSection[] = displayOffers.flatMap((offer) => {
		const activeOffer = activeById.get(offer.id);
		if (!activeOffer || !hasItemScopeConditions(activeOffer)) {
			return [];
		}

		const products = filterProductsForOffer(
			productPool.products.filter((product) => !usedProductIds.has(product.id)),
			activeOffer,
			PRODUCTS_PER_SECTION,
		);

		for (const product of products) {
			usedProductIds.add(product.id);
		}

		return [{ offer, activeOffer, products }];
	});

	return { spotlight, spotlightOfferBadgeLabel, sections };
}
