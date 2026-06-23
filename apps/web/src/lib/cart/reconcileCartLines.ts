import type { VariantAttributes } from "@store/db";
import type { Types } from "mongoose";

import { connectDB, Product as ProductModel } from "@store/db";
import { isVariantInStock, objectIdString } from "@store/shared";

import { applyCatalogVisibility, resolveCatalogVisibility } from "@/lib/core/queries";
import { GRADE_DIMENSION_KEY, variantMatchesSelection } from "@/lib/catalog/pdpSelection";

export interface CartReconcileInputLine {
	id: string;
	productId: string;
	variantId: string;
	gradeSlug: string;
	attributes: Record<string, string | string[]>;
}

export type CartReconcileLineStatus = "ok" | "remapped" | "unavailable";

export interface CartReconcileLineResult {
	id: string;
	status: CartReconcileLineStatus;
	productName?: string;
	variantId?: string;
	unitPriceRupees?: number;
	maxQuantity?: number;
	message?: string;
}

type ProductLean = {
	_id: Types.ObjectId;
	name: string;
	isActive?: boolean;
	isArchived?: boolean;
	variants?: VariantAttributes[];
};

function selectionFromCartLine(line: Pick<CartReconcileInputLine, "gradeSlug" | "attributes">): Record<string, string> {
	const selection: Record<string, string> = {
		[GRADE_DIMENSION_KEY]: line.gradeSlug,
	};
	for (const [slug, value] of Object.entries(line.attributes ?? {})) {
		const resolved = Array.isArray(value) ? value[0] : value;
		if (resolved) {
			selection[slug] = resolved;
		}
	}
	return selection;
}

function storefrontVariantFromLean(variant: VariantAttributes) {
	return {
		id: objectIdString(variant._id),
		gradeSlug: variant.gradeSlug,
		priceRupees: variant.priceRupees,
		quantity: variant.quantity ?? 0,
		forceOutOfStock: variant.forceOutOfStock === true,
		attributes: variant.attributes ?? {},
	};
}

export function findVariantOnProduct(product: ProductLean, line: Pick<CartReconcileInputLine, "variantId" | "gradeSlug" | "attributes">) {
	const variants = product.variants ?? [];
	const byId = variants.find((candidate) => objectIdString(candidate._id) === line.variantId);
	if (byId) {
		return byId;
	}

	const selection = selectionFromCartLine(line);
	return variants.find((candidate) => variantMatchesSelection(storefrontVariantFromLean(candidate), selection));
}

/**
 * Reconcile browser cart lines against current catalog rows.
 * Remaps stale variant IDs when grade + attributes still match a live row.
 */
export async function reconcileCartLines(lines: CartReconcileInputLine[]): Promise<CartReconcileLineResult[]> {
	if (lines.length === 0) {
		return [];
	}

	const productIds = [...new Set(lines.map((line) => line.productId))];
	await connectDB();
	const productFilter: Record<string, unknown> = {
		_id: { $in: productIds },
		isActive: true,
		isArchived: { $ne: true },
	};
	applyCatalogVisibility(productFilter, await resolveCatalogVisibility());
	const products = await ProductModel.find(productFilter)
		.select("name variants isActive isArchived")
		.lean<ProductLean[]>();
	const productMap = new Map(products.map((product) => [product._id.toString(), product]));

	return lines.map((line) => {
		const product = productMap.get(line.productId);
		if (!product) {
			return {
				id: line.id,
				status: "unavailable" as const,
				productName: line.productId,
				message: "This product is no longer available. Remove it from your cart and choose a replacement from the shop.",
			};
		}

		const variant = findVariantOnProduct(product, line);
		if (!variant) {
			const outdatedLine = line.gradeSlug.trim().length === 0;
			return {
				id: line.id,
				status: "unavailable" as const,
				productName: product.name,
				message: outdatedLine
					? `${product.name} in your cart is out of date. Remove it and add the product again from its page.`
					: `This configuration of ${product.name} is no longer available. Remove it and add the product again from its page.`,
			};
		}

		const variantId = objectIdString(variant._id);
		if (
			!isVariantInStock({
				quantity: variant.quantity ?? 0,
				forceOutOfStock: variant.forceOutOfStock === true,
			})
		) {
			return {
				id: line.id,
				status: "unavailable" as const,
				productName: product.name,
				message: `${product.name} is sold out. Remove it from your cart or pick another configuration on the product page.`,
			};
		}

		const remapped = variantId !== line.variantId;
		return {
			id: line.id,
			status: remapped ? ("remapped" as const) : ("ok" as const),
			productName: product.name,
			variantId,
			unitPriceRupees: variant.priceRupees,
			maxQuantity: variant.quantity ?? 0,
			...(remapped
				? {
						message: `${product.name} was updated in our catalog — your selection was refreshed.`,
					}
				: {}),
		};
	});
}
