import { formatPrice, type AssistantCatalogTableRow, type Product } from "@store/shared";

import { productHref } from "@/lib/catalog/productPaths";
import { isProductInStock } from "@/lib/productSummary";

export function cheapestPriceSummary(product: Product): string {
	const cheapestByGrade = new Map<string, number>();
	for (const variant of product.variants) {
		if (variant.priceRupees <= 0) {
			continue;
		}
		const grade = variant.gradeSlug || "standard";
		const current = cheapestByGrade.get(grade);
		if (current === undefined || variant.priceRupees < current) {
			cheapestByGrade.set(grade, variant.priceRupees);
		}
	}
	if (cheapestByGrade.size === 0) {
		return "price on request";
	}
	let lowestPrice = Infinity;
	let lowestGrade = "";
	for (const [grade, price] of cheapestByGrade.entries()) {
		if (price < lowestPrice) {
			lowestPrice = price;
			lowestGrade = grade;
		}
	}
	return lowestGrade ? `${lowestGrade} from ${formatPrice(lowestPrice)}` : formatPrice(lowestPrice);
}

export function productToCatalogTableRow(product: Product): AssistantCatalogTableRow {
	return {
		name: `${product.brandName} ${product.name}`.trim(),
		priceSummary: cheapestPriceSummary(product),
		stockLabel: isProductInStock(product) ? "in stock" : "out of stock",
		linkPath: productHref(product),
	};
}
