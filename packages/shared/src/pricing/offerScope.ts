import type { OfferCondition } from "./offerTypes";
import type { EvaluatableItem } from "./offerEvaluator";
import { isCheckoutOnlyOffer, isStorewideOffer, matchesCondition } from "./offerMatching";
import type { ActiveOffer } from "./offerEvaluator";

const CATALOG_CONDITION_TYPES = new Set<OfferCondition["type"]>(["categories", "brands", "grades", "products", "attributes"]);

export interface OfferCatalogProductVariant {
	gradeSlug: string;
	attributes: Record<string, string | string[]>;
}

/** Minimal product shape for catalog overlap checks. */
export interface OfferCatalogProduct {
	id: string;
	name: string;
	categorySlug: string;
	brandSlug: string;
	variants: OfferCatalogProductVariant[];
}

export interface OfferScopeConflict {
	conflictingOfferId: string;
	conflictingOfferTitle: string;
	productId: string;
	productName: string;
}

function asStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.map((entry) => String(entry)).filter(Boolean);
}

/** Scenario = AND group inside the specific-items OR group (or a flat AND of catalog conditions). */
export function extractOfferScenarios(conditions: OfferCondition[]): OfferCondition[] {
	const orGroup = conditions.find((condition) => condition.type === "group" && condition.operator === "or");
	if (orGroup && Array.isArray(orGroup.value)) {
		const scenarios = (orGroup.value as OfferCondition[]).filter((condition) => condition.type === "group" && condition.operator === "and");
		if (scenarios.length > 0) {
			return scenarios;
		}
	}

	const flatCatalogConditions = conditions.filter((condition) => CATALOG_CONDITION_TYPES.has(condition.type));
	if (flatCatalogConditions.length > 0) {
		return [{ type: "group", operator: "and", value: flatCatalogConditions }];
	}

	return [];
}

export function offerHasCatalogItemScope(conditions: OfferCondition[]): boolean {
	if (isStorewideOffer({ conditions } as ActiveOffer)) {
		return true;
	}
	if (isCheckoutOnlyOffer({ conditions } as ActiveOffer)) {
		return false;
	}
	return extractOfferScenarios(conditions).length > 0;
}

function scenarioCatalogConditions(scenario: OfferCondition): OfferCondition[] {
	if (scenario.type !== "group" || scenario.operator !== "and" || !Array.isArray(scenario.value)) {
		return [];
	}
	return (scenario.value as OfferCondition[]).filter((condition) => CATALOG_CONDITION_TYPES.has(condition.type));
}

function productMatchesScenario(product: OfferCatalogProduct, scenario: OfferCondition): boolean {
	const catalogConditions = scenarioCatalogConditions(scenario);
	if (catalogConditions.length === 0) {
		return false;
	}

	const context = { cartTotal: 0 };
	for (const variant of product.variants) {
		const item: EvaluatableItem = {
			id: `${product.id}:${variant.gradeSlug}`,
			productId: product.id,
			variantId: "",
			categorySlug: product.categorySlug,
			brandSlug: product.brandSlug,
			gradeSlug: variant.gradeSlug,
			price: 0,
			quantity: 1,
			attributes: variant.attributes ?? {},
		};
		if (catalogConditions.every((condition) => matchesCondition(item, condition, context))) {
			return true;
		}
	}

	return false;
}

function productMatchesOfferCatalogScope(product: OfferCatalogProduct, conditions: OfferCondition[]): boolean {
	if (isStorewideOffer({ conditions } as ActiveOffer)) {
		return true;
	}
	const scenarios = extractOfferScenarios(conditions);
	if (scenarios.length === 0) {
		return false;
	}
	return scenarios.some((scenario) => productMatchesScenario(product, scenario));
}

/**
 * Returns the first catalog product that would match both offer condition sets.
 * Parent scopes (category / brand) and child scopes (specific product) overlap
 * when any single product matches both.
 */
export function findOfferCatalogScopeConflict(
	candidateConditions: OfferCondition[],
	existingOffers: Array<{ id: string; title: string; conditions: OfferCondition[] }>,
	products: OfferCatalogProduct[],
	excludeOfferId?: string,
): OfferScopeConflict | null {
	if (!offerHasCatalogItemScope(candidateConditions)) {
		return null;
	}

	const peers = existingOffers.filter((offer) => offer.id !== excludeOfferId && offerHasCatalogItemScope(offer.conditions));

	for (const peer of peers) {
		for (const product of products) {
			if (productMatchesOfferCatalogScope(product, candidateConditions) && productMatchesOfferCatalogScope(product, peer.conditions)) {
				return {
					conflictingOfferId: peer.id,
					conflictingOfferTitle: peer.title,
					productId: product.id,
					productName: product.name,
				};
			}
		}
	}

	return null;
}

export function formatOfferScopeConflictMessage(conflict: OfferScopeConflict): string {
	return `"${conflict.productName}" already matches offer "${conflict.conflictingOfferTitle}". A product cannot belong to two item-specific offers — adjust or deactivate the other offer first.`;
}

/** Whether picking this product in a scenario would overlap another offer. */
export function wouldProductSelectionConflict(
	candidateConditions: OfferCondition[],
	scenarioIndex: number,
	product: OfferCatalogProduct,
	existingOffers: Array<{ id: string; title: string; conditions: OfferCondition[] }>,
	excludeOfferId?: string,
): OfferScopeConflict | null {
	const hypothetical = setScenarioProductAtIndex(candidateConditions, scenarioIndex, product.id);
	return findOfferCatalogScopeConflict(hypothetical, existingOffers, [product], excludeOfferId);
}

function setScenarioProductAtIndex(conditions: OfferCondition[], scenarioIndex: number, productId: string): OfferCondition[] {
	const next = structuredClone(conditions) as OfferCondition[];
	const orIndex = next.findIndex((condition) => condition.type === "group" && condition.operator === "or");
	if (orIndex === -1) {
		return next;
	}
	const orGroup = next[orIndex];
	if (!Array.isArray(orGroup.value) || orGroup.value.length === 0) {
		return next;
	}
	const scenarios = orGroup.value as OfferCondition[];
	if (!scenarios[scenarioIndex]) {
		return next;
	}
	const scenario = scenarios[scenarioIndex];
	if (scenario.type !== "group" || !Array.isArray(scenario.value)) {
		return next;
	}
	const subs = [...(scenario.value as OfferCondition[])];
	const productIndex = subs.findIndex((condition) => condition.type === "products");
	if (productIndex > -1) {
		subs[productIndex] = { type: "products", operator: "in", value: [productId] };
	} else {
		subs.push({ type: "products", operator: "in", value: [productId] });
	}
	scenarios[scenarioIndex] = { type: "group", operator: "and", value: subs };
	orGroup.value = scenarios;
	next[orIndex] = orGroup;
	return next;
}

function setScenarioProduct(conditions: OfferCondition[], productId: string): OfferCondition[] {
	return setScenarioProductAtIndex(conditions, 0, productId);
}

export function summarizeScenarioScope(scenario: OfferCondition): {
	categorySlugs: string[];
	brandSlugs: string[];
	gradeSlugs: string[];
	productIds: string[];
} {
	const subs = scenarioCatalogConditions(scenario);
	const pick = (type: OfferCondition["type"]) => asStringArray(subs.find((condition) => condition.type === type)?.value);
	return {
		categorySlugs: pick("categories"),
		brandSlugs: pick("brands"),
		gradeSlugs: pick("grades"),
		productIds: pick("products"),
	};
}
