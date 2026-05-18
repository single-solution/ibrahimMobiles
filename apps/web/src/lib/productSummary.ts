/**
 * Pure, dependency-free helpers that derive display-time values
 * (default variant, in-stock flag, offer flag) from a hydrated `Phone |
 * Accessory | Gadget`. They never touch the database, never import any
 * model, and never read from `src/data/*` — safe for both server and
 * client bundles.
 */

import type {
	AnyVariant,
	ConditionGrade,
	Phone,
	PhoneVariant,
	Product,
} from "@store/shared";

const GRADE_RANK: Record<ConditionGrade, number> = {
	"brand-new": 0,
	genuine: 1,
	"box-open": 2,
	refurbished: 3,
	"china-water": 4,
	"lcd-shaded": 5,
};

/**
 * Cheapest in-stock phone variant, falling back to the cheapest overall
 * when nothing is in stock. Grade is the primary sort key (a brand-new
 * variant always wins ties); price breaks the tie.
 */
function pickPhoneDefault(phone: Phone): PhoneVariant {
	const inStock = phone.variants.filter((variant) => variant.isInStock);
	const candidates = inStock.length > 0 ? inStock : phone.variants;
	return [...candidates].sort((left, right) => {
		const gradeDelta = GRADE_RANK[left.grade] - GRADE_RANK[right.grade];
		if (gradeDelta !== 0) {
			return gradeDelta;
		}
		return left.priceRupees - right.priceRupees;
	})[0];
}

/**
 * Return a sensible "starting" variant for any product type. Phones use
 * grade-then-price ranking; accessories and gadgets fall back to the
 * cheapest in-stock variant. The overload preserves `PhoneVariant` for
 * callers that already hold a `Phone`-narrowed product.
 */
export function getDefaultVariant(phone: Phone): PhoneVariant;
export function getDefaultVariant(product: Product): AnyVariant;
export function getDefaultVariant(product: Product): AnyVariant {
	if (product.category === "phone") {
		return pickPhoneDefault(product);
	}
	const inStock = product.variants.filter((variant) => variant.isInStock);
	const pool = inStock.length > 0 ? inStock : product.variants;
	return pool.reduce((cheapest, candidate) =>
		candidate.priceRupees < cheapest.priceRupees ? candidate : cheapest,
	);
}

export function isProductInStock(product: Product): boolean {
	return product.variants.some((variant) => variant.isInStock);
}

export function hasAnyOffer(product: Product): boolean {
	return product.variants.some(
		(variant) => variant.originalPriceRupees > variant.priceRupees,
	);
}
