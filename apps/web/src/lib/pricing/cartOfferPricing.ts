import type { ActiveOffer, EvaluatableItem, Product } from "@store/shared";
import { computeLockedItemOfferDiscount, resolveOfferMinQuantity } from "@store/shared";

import { buildEvaluatableItem } from "@/lib/pricing/productOfferMatch";

export function buildEvaluatableItemWithQuantity(product: Product, variant: Product["variants"][number], quantity: number): EvaluatableItem {
	return {
		...buildEvaluatableItem(product, variant),
		quantity,
	};
}

export function resolvePdpOfferUnitPrice(listUnitPriceRupees: number, item: EvaluatableItem, offer: ActiveOffer | null): { unitPriceRupees: number; hasOfferDiscount: boolean } {
	if (!offer) {
		return { unitPriceRupees: listUnitPriceRupees, hasOfferDiscount: false };
	}

	const context = {
		cartTotal: listUnitPriceRupees * item.quantity,
	};

	const discountRupees = computeLockedItemOfferDiscount(item, offer, context);
	if (discountRupees <= 0) {
		return { unitPriceRupees: listUnitPriceRupees, hasOfferDiscount: false };
	}

	const lineTotalRupees = listUnitPriceRupees * item.quantity;
	const saleLineTotalRupees = lineTotalRupees - discountRupees;
	const unitPriceRupees = Math.round(saleLineTotalRupees / item.quantity);

	return {
		unitPriceRupees,
		hasOfferDiscount: unitPriceRupees < listUnitPriceRupees,
	};
}

export { resolveOfferMinQuantity };

export function buildCartLineOfferIds(items: Array<{ id: string; appliedOfferId?: string }>): Record<string, string | undefined> {
	return Object.fromEntries(items.filter((line) => typeof line.appliedOfferId === "string" && line.appliedOfferId.length > 0).map((line) => [line.id, line.appliedOfferId]));
}
