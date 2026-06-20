import type { OfferAction, OfferSchedule } from "./offerTypes";
import {
	cartMatchesOffer,
	getMatchedCartItems,
	type EvaluateOffersOptions,
	type OfferMatchContext,
} from "./offerMatching";
import { isOfferEligible } from "./offerSchedule";

export interface EvaluatableItem {
	id: string;
	productId: string;
	variantId: string;
	categorySlug: string;
	brandSlug: string;
	gradeSlug: string;
	price: number;
	quantity: number;
	attributes: Record<string, string | string[]>;
}

export interface ActiveOffer {
	id: string;
	title: string;
	/** Short label for product-card / gallery badges. */
	badgeLabel?: string;
	conditions: import("./offerTypes").OfferCondition[];
	action: OfferAction;
	schedule: OfferSchedule;
	isStackable: boolean;
	allowLoyaltyPoints: boolean;
	/** Max total redemptions; `undefined`/`0` means unlimited. */
	usageLimit?: number;
	/** Redemptions so far — used with `usageLimit` to retire exhausted offers. */
	usageCount?: number;
}

export interface DiscountApplication {
	offerId: string;
	offerTitle: string;
	discountAmount: number;
}

export interface OfferEvaluationResult {
	itemDiscounts: Map<string, DiscountApplication[]>;
	cartDiscounts: DiscountApplication[];
	totalDiscount: number;
	finalTotal: number;
	isLoyaltyPointsAllowed: boolean;
	/** True when an applicable offer grants free shipping. */
	freeShipping: boolean;
	/** IDs of offers that actually applied — used to bump `usageCount`. */
	appliedOfferIds: string[];
}

export { isOfferActiveSchedule, isOfferEligible, isOfferUsageExhausted } from "./offerSchedule";

const PERCENTAGE_DIVISOR = 100;

export function evaluateOffers(
	items: EvaluatableItem[],
	offers: ActiveOffer[],
	options: EvaluateOffersOptions = {},
): OfferEvaluationResult {
	let cartTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	let totalDiscount = 0;

	const context: OfferMatchContext = {
		cartTotal,
		paymentMethod: options.paymentMethod,
	};

	const validOffers = offers.filter((offer) => isOfferEligible(offer));

	const itemDiscounts = new Map<string, DiscountApplication[]>();
	const cartDiscounts: DiscountApplication[] = [];
	const appliedOfferIds: string[] = [];

	let isLoyaltyPointsAllowed = true;
	let freeShipping = false;

	// First matching offer wins (admin `sortOrder`). Bank-transfer % stays in settings.
	for (const offer of validOffers) {
		const matchedItems = getMatchedCartItems(items, offer, context);
		const hasItemConditions = offer.conditions.some(
			(condition) => condition.type !== "cart_total" && condition.type !== "payment_method",
		);

		if (hasItemConditions && matchedItems.length === 0) {
			continue;
		}

		if (!hasItemConditions && !cartMatchesOffer(offer, context)) {
			continue;
		}

		let applied = false;

		if (offer.action.type === "free_shipping") {
			freeShipping = true;
			applied = true;
		} else if (offer.action.type === "buy_x_get_y") {
			continue;
		} else {
			switch (offer.action.target) {
				case "cart_total": {
					let offerDiscount = 0;
					if (offer.action.type === "percentage_discount") {
						offerDiscount = cartTotal * (offer.action.value / PERCENTAGE_DIVISOR);
					} else if (offer.action.type === "fixed_amount_discount") {
						offerDiscount = Math.min(offer.action.value, cartTotal);
					}
					if (offerDiscount > 0) {
						cartDiscounts.push({
							offerId: offer.id,
							offerTitle: offer.title,
							discountAmount: offerDiscount,
						});
						cartTotal -= offerDiscount;
						totalDiscount += offerDiscount;
						applied = true;
					}
					break;
				}
				case "matched_items": {
					const itemsToDiscount = matchedItems.length > 0 ? matchedItems : items;
					for (const item of itemsToDiscount) {
						let itemDiscount = 0;
						const itemLineTotal = item.price * item.quantity;
						if (offer.action.type === "percentage_discount") {
							itemDiscount = itemLineTotal * (offer.action.value / PERCENTAGE_DIVISOR);
						} else if (offer.action.type === "fixed_amount_discount") {
							itemDiscount = Math.min(offer.action.value * item.quantity, itemLineTotal);
						}

						if (itemDiscount > 0) {
							const currentItemDiscounts = itemDiscounts.get(item.id) ?? [];
							currentItemDiscounts.push({
								offerId: offer.id,
								offerTitle: offer.title,
								discountAmount: itemDiscount,
							});
							itemDiscounts.set(item.id, currentItemDiscounts);
							totalDiscount += itemDiscount;
							cartTotal -= itemDiscount;
							applied = true;
						}
					}
					break;
				}
			}
		}

		if (applied) {
			appliedOfferIds.push(offer.id);
			if (!offer.allowLoyaltyPoints) {
				isLoyaltyPointsAllowed = false;
			}
			break;
		}
	}

	return {
		itemDiscounts,
		cartDiscounts,
		totalDiscount,
		finalTotal: cartTotal,
		isLoyaltyPointsAllowed,
		freeShipping,
		appliedOfferIds,
	};
}
