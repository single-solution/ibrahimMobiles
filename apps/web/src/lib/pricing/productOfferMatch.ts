import type { ActiveOffer, EvaluatableItem, Product } from "@store/shared";
import {
	getStorefrontItemOffers,
	hasItemScopeConditions,
	isCatalogWideStorefrontOffer,
	isVariantInStock,
	resolveItemOfferBadgeLabel,
	resolveStorefrontOfferBadgeLabel,
} from "@store/shared";

export function buildEvaluatableItem(product: Product, variant: Product["variants"][number]): EvaluatableItem {
	return {
		id: `${product.id}:${variant.id}`,
		productId: product.id,
		variantId: variant.id,
		categorySlug: product.categorySlug,
		brandSlug: product.brandSlug,
		gradeSlug: variant.gradeSlug,
		price: variant.priceRupees,
		quantity: 1,
		attributes: variant.attributes ?? {},
	};
}

function productHasInStockVariant(product: Product): boolean {
	return product.variants.some((variant) => isVariantInStock(variant));
}

export function productMatchesStorefrontOffer(product: Product, offer: ActiveOffer): boolean {
	if (isCatalogWideStorefrontOffer(offer)) {
		return productHasInStockVariant(product);
	}

	if (!hasItemScopeConditions(offer)) {
		return false;
	}

	for (const variant of product.variants) {
		if (!isVariantInStock(variant)) {
			continue;
		}
		const item = buildEvaluatableItem(product, variant);
		if (getStorefrontItemOffers(item, [offer]).length > 0) {
			return true;
		}
	}
	return false;
}

export function productHasAnyStorefrontOffer(product: Product, offers: ActiveOffer[]): boolean {
	if (offers.length === 0 || !productHasInStockVariant(product)) {
		return false;
	}

	if (offers.some(isCatalogWideStorefrontOffer)) {
		return true;
	}

	for (const variant of product.variants) {
		if (!isVariantInStock(variant)) {
			continue;
		}
		const item = buildEvaluatableItem(product, variant);
		if (getStorefrontItemOffers(item, offers).length > 0) {
			return true;
		}
	}
	return false;
}

/** Active offers that apply to any in-stock variant on this product (catalog-wide + item rules). */
export function resolveProductApplicableOffers(product: Product, offers: ActiveOffer[]): ActiveOffer[] {
	if (!productHasInStockVariant(product)) {
		return [];
	}

	const matchedIds = new Set<string>();
	for (const offer of offers) {
		if (isCatalogWideStorefrontOffer(offer)) {
			matchedIds.add(offer.id);
			continue;
		}
		if (productMatchesStorefrontOffer(product, offer)) {
			matchedIds.add(offer.id);
		}
	}

	return offers.filter((offer) => matchedIds.has(offer.id));
}

/** Item-targeted offers for product cards — excludes storewide and checkout-only rules. */
export function resolveProductItemScopedOffers(product: Product, offers: ActiveOffer[]): ActiveOffer[] {
	if (!productHasInStockVariant(product)) {
		return [];
	}

	const matchedIds = new Set<string>();
	for (const offer of offers) {
		if (isCatalogWideStorefrontOffer(offer)) {
			continue;
		}
		if (productMatchesStorefrontOffer(product, offer)) {
			matchedIds.add(offer.id);
		}
	}

	return offers.filter((offer) => matchedIds.has(offer.id));
}

/** Item-targeted offers for one variant — excludes storewide and checkout-only rules. */
export function resolveVariantItemScopedOffers(product: Product, variant: Product["variants"][number], offers: ActiveOffer[]): ActiveOffer[] {
	if (!isVariantInStock(variant)) {
		return [];
	}

	const item = buildEvaluatableItem(product, variant);
	return offers.filter((offer) => {
		if (isCatalogWideStorefrontOffer(offer)) {
			return false;
		}
		return getStorefrontItemOffers(item, [offer]).length > 0;
	});
}

export function filterProductsForOffer(products: Product[], offer: ActiveOffer, limit: number): Product[] {
	const matched: Product[] = [];
	for (const product of products) {
		if (productMatchesStorefrontOffer(product, offer)) {
			matched.push(product);
			if (matched.length >= limit) {
				break;
			}
		}
	}
	return matched;
}

/** First matching offer badge for any in-stock variant on the product. */
export function resolveProductOfferBadgeLabel(product: Product, offers: ActiveOffer[]): string | null {
	for (const variant of product.variants) {
		if (!isVariantInStock(variant)) {
			continue;
		}
		const label = resolveItemOfferBadgeLabel(buildEvaluatableItem(product, variant), offers);
		if (label) {
			return label;
		}
	}
	return null;
}

/** Badge for a specific variant when spotlighting one SKU. */
export function resolveVariantOfferBadgeLabel(product: Product, variant: Product["variants"][number], offers: ActiveOffer[]): string | null {
	if (!isVariantInStock(variant)) {
		return null;
	}
	return resolveItemOfferBadgeLabel(buildEvaluatableItem(product, variant), offers);
}

export { resolveItemOfferBadgeLabel, resolveStorefrontOfferBadgeLabel };

/** First in-stock variant used for spotlight pricing copy. */
export function resolveSpotlightVariant(product: Product): Product["variants"][number] | null {
	const inStock = product.variants.filter((variant) => isVariantInStock(variant));
	return inStock[0] ?? null;
}
