/**
 * Fresh per-variant commerce data (price, stock count) for the PDP.
 *
 * The PDP shell (gallery, name, breadcrumbs, related products, grade
 * showcase) comes from `getProductBySlugCached` — cross-request
 * cached with 30s TTL and bust-on-admin-edit. Pricing and stock on that
 * shell can be slightly stale; this helper is what the page renders
 * inside a Suspense boundary to overlay current values without ever
 * touching the cache layer.
 *
 * Projection-only Mongo query — fetches just `_id`, `priceRupees`, and
 * `quantity` for every variant. Cheap enough to run on every PDP request
 * and keeps the response payload tiny.
 *
 * Wrapped in React `cache()` so a single render that needs the live data
 * twice (mobile + desktop Suspense boundaries on the same page) shares
 * one Mongo round-trip.
 */
import { cache } from "react";

import { connectDB, Product as ProductModel } from "@store/db";
import type { Product } from "@store/shared";

import { PUBLIC_PRODUCT_FILTER } from "@/lib/core/queries";

export interface LiveVariantCommerce {
	id: string;
	priceRupees: number;
	quantity: number;
}

interface LiveVariantLean {
	_id: { toString(): string } | string;
	priceRupees?: number;
	quantity?: number;
}

interface ProductLiveLean {
	variants?: LiveVariantLean[];
}

async function fetchProductLiveCommerce(
	slug: string,
): Promise<LiveVariantCommerce[] | null> {
	await connectDB();
	const product = await ProductModel.findOne(
		{ slug: slug.toLowerCase(), ...PUBLIC_PRODUCT_FILTER },
		{
			"variants._id": 1,
			"variants.priceRupees": 1,
			"variants.quantity": 1,
		},
	).lean<ProductLiveLean>();

	if (!product) {
		return null;
	}

	return (product.variants ?? []).map((variant) => ({
		id: typeof variant._id === "string" ? variant._id : variant._id.toString(),
		priceRupees: Number(variant.priceRupees ?? 0),
		quantity: Number(variant.quantity ?? 0),
	}));
}

/**
 * Per-render-deduped live commerce fetch. Mobile + desktop Suspense
 * boundaries on the same PDP share one Mongo hit; cross-request is
 * always fresh.
 */
export const getProductLiveCommerce = cache(
	fetchProductLiveCommerce,
);

/**
 * Overlay live `priceRupees` + `quantity` onto a cached product shell.
 * Returns a shallow clone with new `variants[]`; unchanged variants keep
 * their reference identity from the shell.
 */
export function mergeProductWithLiveCommerce(
	product: Product,
	live: LiveVariantCommerce[] | null,
): Product {
	if (!live || live.length === 0) {
		return product;
	}
	const liveMap = new Map(live.map((variant) => [variant.id, variant]));
	let touched = false;
	const variants = product.variants.map((variant) => {
		const liveVariant = liveMap.get(variant.id);
		if (!liveVariant) {
			return variant;
		}
		if (
			liveVariant.priceRupees === variant.priceRupees &&
			liveVariant.quantity === variant.quantity
		) {
			return variant;
		}
		touched = true;
		return {
			...variant,
			priceRupees: liveVariant.priceRupees,
			quantity: liveVariant.quantity,
		};
	});
	if (!touched) {
		return product;
	}
	return { ...product, variants };
}
