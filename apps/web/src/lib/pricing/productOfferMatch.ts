import type { ActiveOffer, EvaluatableItem, Product } from "@store/shared";
import {
	getStorefrontItemOffers,
	hasItemScopeConditions,
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

export function productMatchesStorefrontOffer(product: Product, offer: ActiveOffer): boolean {
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
	if (offers.length === 0) {
		return false;
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

export function filterProductsForOffer(
	products: Product[],
	offer: ActiveOffer,
	limit: number,
): Product[] {
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
export function resolveProductOfferBadgeLabel(
	product: Product,
	offers: ActiveOffer[],
): string | null {
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
export function resolveVariantOfferBadgeLabel(
	product: Product,
	variant: Product["variants"][number],
	offers: ActiveOffer[],
): string | null {
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
