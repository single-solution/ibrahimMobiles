import type { OfferAction } from "./offerTypes";
import type { ActiveOffer, EvaluatableItem } from "./offerEvaluator";
import { getStorefrontItemOffers } from "./offerMatching";

/** Primary badge copy for card / gallery overlays — first matched offer by sort order. */
export function resolveStorefrontOfferBadgeLabel(matchedOffers: ActiveOffer[]): string | null {
	const primary = matchedOffers[0];
	if (!primary) {
		return null;
	}
	const label = primary.badgeLabel?.trim();
	if (label) {
		return label;
	}
	return primary.title?.trim() || null;
}

export function resolveItemOfferBadgeLabel(
	item: EvaluatableItem,
	offers: ActiveOffer[],
): string | null {
	return resolveStorefrontOfferBadgeLabel(getStorefrontItemOffers(item, offers));
}

/** Info-only copy for card / PDP — never shows a computed discount amount. */
export function formatOfferActionHint(action: OfferAction): string {
	switch (action.type) {
		case "free_shipping":
			return "Free delivery applied at checkout";
		case "percentage_discount":
			return `${action.value}% off at checkout`;
		case "fixed_amount_discount":
			return `Rs ${action.value.toLocaleString("en-PK")} off at checkout`;
		case "buy_x_get_y":
			return "Special offer at checkout";
		default:
			return "Offer applied at checkout";
	}
}
