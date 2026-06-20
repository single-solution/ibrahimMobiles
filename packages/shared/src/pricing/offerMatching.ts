import type { OfferCondition } from "./offerTypes";
import type { ActiveOffer, EvaluatableItem } from "./offerEvaluator";
import { isOfferEligible } from "./offerSchedule";

/** Checkout payment ids — matches storefront checkout panel values. */
export type OfferPaymentMethod = "bank" | "easypaisa" | "jazzcash" | "cod";

export type OfferMatchContext = {
	cartTotal: number;
	paymentMethod?: OfferPaymentMethod;
};

export type EvaluateOffersOptions = {
	paymentMethod?: OfferPaymentMethod;
};

const CHECKOUT_ONLY_CONDITION_TYPES = new Set<OfferCondition["type"]>([
	"cart_total",
	"payment_method",
]);

/** Conditions that tie an offer to catalog items (card / PDP hints). */
export function hasItemScopeConditions(offer: ActiveOffer): boolean {
	return offer.conditions.some((condition) => !CHECKOUT_ONLY_CONDITION_TYPES.has(condition.type));
}

export function matchesCondition(
	item: EvaluatableItem,
	condition: OfferCondition,
	context: OfferMatchContext,
): boolean {
	if (condition.type === "group") {
		const subConditions = condition.value as OfferCondition[];
		if (!Array.isArray(subConditions) || subConditions.length === 0) return false;
		if (condition.operator === "or") {
			return subConditions.some((c) => matchesCondition(item, c, context));
		}
		return subConditions.every((c) => matchesCondition(item, c, context));
	}

	let itemValue: unknown;

	switch (condition.type) {
		case "products":
			itemValue = item.productId;
			break;
		case "categories":
			itemValue = item.categorySlug;
			break;
		case "brands":
			itemValue = item.brandSlug;
			break;
		case "grades":
			itemValue = item.gradeSlug;
			break;
		case "price_range":
			itemValue = item.price;
			break;
		case "cart_total":
			itemValue = context.cartTotal;
			break;
		case "min_quantity":
			itemValue = item.quantity;
			break;
		case "payment_method":
			if (!context.paymentMethod) {
				return false;
			}
			itemValue = context.paymentMethod;
			break;
		case "attributes": {
			if (typeof condition.value !== "object" || condition.value === null) {
				return false;
			}
			const attributeValue = item.attributes?.[condition.value.slug];
			if (Array.isArray(attributeValue)) {
				return attributeValue.includes(condition.value.value);
			}
			return attributeValue === condition.value.value;
		}
		default:
			return false;
	}

	const targetValue = condition.value;

	switch (condition.operator) {
		case "in":
			if (Array.isArray(targetValue)) {
				return targetValue.includes(itemValue);
			}
			return targetValue === itemValue;
		case "not_in":
			if (Array.isArray(targetValue)) {
				return !targetValue.includes(itemValue);
			}
			return targetValue !== itemValue;
		case "between":
			if (Array.isArray(targetValue) && targetValue.length === 2) {
				return (
					(itemValue as number) >= targetValue[0] &&
					(itemValue as number) <= targetValue[1]
				);
			}
			return false;
		case "gte":
			return (itemValue as number) >= targetValue;
		case "lte":
			return (itemValue as number) <= targetValue;
		default:
			return false;
	}
}

function itemMatchesAllConditions(
	item: EvaluatableItem,
	offer: ActiveOffer,
	context: OfferMatchContext,
	options?: { ignoreCheckoutConditions?: boolean },
): boolean {
	const conditions = options?.ignoreCheckoutConditions
		? offer.conditions.filter((condition) => !CHECKOUT_ONLY_CONDITION_TYPES.has(condition.type))
		: offer.conditions;

	if (conditions.length === 0) {
		return !options?.ignoreCheckoutConditions;
	}

	return conditions.every((condition) => matchesCondition(item, condition, context));
}

/** Offers to hint on product cards / PDP (ignores cart total + payment method). */
export function getStorefrontItemOffers(
	item: EvaluatableItem,
	offers: ActiveOffer[],
	cartTotal?: number,
): ActiveOffer[] {
	const context: OfferMatchContext = {
		cartTotal: cartTotal ?? item.price * item.quantity,
	};

	return offers.filter((offer) => {
		if (!isOfferEligible(offer)) {
			return false;
		}
		if (!hasItemScopeConditions(offer)) {
			return false;
		}
		return itemMatchesAllConditions(item, offer, context, { ignoreCheckoutConditions: true });
	});
}

export function getMatchedCartItems(
	items: EvaluatableItem[],
	offer: ActiveOffer,
	context: OfferMatchContext,
): EvaluatableItem[] {
	const matchedItems: EvaluatableItem[] = [];
	for (const item of items) {
		if (itemMatchesAllConditions(item, offer, context)) {
			matchedItems.push(item);
		}
	}
	return matchedItems;
}

/** Whole-cart offers with no item conditions — evaluated once against cart context. */
export function cartMatchesOffer(offer: ActiveOffer, context: OfferMatchContext): boolean {
	if (offer.conditions.length === 0) {
		return true;
	}
	const syntheticItem: EvaluatableItem = {
		id: "cart",
		productId: "",
		variantId: "",
		categorySlug: "",
		brandSlug: "",
		gradeSlug: "",
		price: context.cartTotal,
		quantity: 1,
		attributes: {},
	};
	return itemMatchesAllConditions(syntheticItem, offer, context);
}
