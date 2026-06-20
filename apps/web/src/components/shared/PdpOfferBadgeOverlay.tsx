"use client";

import { useMemo } from "react";

import { resolveItemOfferBadgeLabel, type Product, isVariantInStock } from "@store/shared";

import { useVariantSelection } from "@/components/shared/VariantContext";
import { ProductCardOfferBadge } from "@/components/shared/ProductCardOfferBadge";
import { buildEvaluatableItem } from "@/lib/pricing/productOfferMatch";
import { useActiveOffers } from "@/lib/pricing/useActiveOffers";

/** Offer badge overlay on the PDP gallery — follows the selected variant. */
export function PdpOfferBadgeOverlay({ product }: { product: Product }) {
	const { selectedVariantId } = useVariantSelection();
	const { offers } = useActiveOffers();

	const badgeLabel = useMemo(() => {
		const variant = product.variants.find((row) => row.id === selectedVariantId);
		if (!variant || !isVariantInStock(variant)) {
			return null;
		}
		return resolveItemOfferBadgeLabel(buildEvaluatableItem(product, variant), offers);
	}, [offers, product, selectedVariantId]);

	if (!badgeLabel) {
		return null;
	}

	return (
		<div className="pointer-events-none absolute right-2 top-2 z-10 md:right-3 md:top-3">
			<ProductCardOfferBadge label={badgeLabel} />
		</div>
	);
}
