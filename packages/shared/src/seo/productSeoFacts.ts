/**
 * Layer 1 SEO facts derived from the live variant matrix.
 * Shared by storefront meta, JSON-LD, admin SERP preview, and PDP facts block.
 */

import { isVariantInStock } from "../catalog/variantAvailability";
import { formatPrice } from "../formatters";
import type { AttributeDescriptor, Product, Variant } from "../types";

const SERP_TITLE_MAX = 60;
const SERP_DESCRIPTION_MAX = 160;

export interface ProductSeoFactsContext {
	gradeLabels?: Record<string, string>;
	attributes?: AttributeDescriptor[];
}

export interface ProductSeoFacts {
	baseTitle: string;
	brandName: string;
	productName: string;
	categoryLabel: string;
	storeName: string;
	minPriceRupees: number | null;
	maxPriceRupees: number | null;
	priceLead: string;
	gradeList: string;
	gradesInStock: string[];
	topAttributesSummary: string;
	inStockVariantCount: number;
	totalVariantCount: number;
}

export function truncateSerpTitle(input: string): string {
	const trimmed = input.trim();
	if (trimmed.length <= SERP_TITLE_MAX) {
		return trimmed;
	}
	const slice = trimmed.slice(0, SERP_TITLE_MAX);
	const lastSpace = slice.lastIndexOf(" ");
	return lastSpace > 40 ? `${slice.slice(0, lastSpace).trimEnd()}…` : `${slice.trimEnd()}…`;
}

export function truncateSerpDescription(input: string): string {
	const trimmed = input.trim();
	if (trimmed.length <= SERP_DESCRIPTION_MAX) {
		return trimmed;
	}
	const slice = trimmed.slice(0, SERP_DESCRIPTION_MAX);
	const lastSpace = slice.lastIndexOf(" ");
	return lastSpace > 80 ? `${slice.slice(0, lastSpace).trimEnd()}…` : `${slice.trimEnd()}…`;
}

function humanizeSlug(slug: string): string {
	return slug
		.split("-")
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(" ");
}

function resolveGradeLabel(gradeSlug: string, gradeLabels: Record<string, string> | undefined): string {
	return gradeLabels?.[gradeSlug]?.trim() || humanizeSlug(gradeSlug);
}

function collectAttributeValues(variants: Variant[], attributeSlug: string): string[] {
	const values = new Set<string>();
	for (const variant of variants) {
		const raw = variant.attributes[attributeSlug];
		if (typeof raw === "string" && raw.trim()) {
			values.add(raw.trim());
		}
		if (Array.isArray(raw)) {
			for (const entry of raw) {
				if (typeof entry === "string" && entry.trim()) {
					values.add(entry.trim());
				}
			}
		}
	}
	return [...values];
}

function resolveOptionLabel(descriptor: AttributeDescriptor | undefined, value: string): string {
	const match = descriptor?.options.find((option) => option.value === value);
	return match?.label?.trim() || value;
}

function buildTopAttributesSummary(product: Product, variants: Variant[], attributes: AttributeDescriptor[] | undefined): string {
	const attributeSlugs = product.attributeSlugs ?? [];
	if (attributeSlugs.length === 0) {
		return "";
	}

	const descriptorsBySlug = new Map((attributes ?? []).map((descriptor) => [descriptor.slug, descriptor]));
	const snippets: string[] = [];

	for (const attributeSlug of attributeSlugs) {
		const values = collectAttributeValues(variants, attributeSlug);
		if (values.length === 0) {
			continue;
		}
		const descriptor = descriptorsBySlug.get(attributeSlug);
		const attributeLabel = descriptor?.label?.trim() || humanizeSlug(attributeSlug);
		if (values.length === 1) {
			snippets.push(resolveOptionLabel(descriptor, values[0]!));
			continue;
		}
		const lowerLabel = attributeLabel.toLowerCase();
		snippets.push(`${values.length} ${lowerLabel}`);
	}

	return snippets.slice(0, 4).join(", ");
}

function buildVariantAttributeLabels(
	variant: Variant,
	attributes: AttributeDescriptor[] | undefined,
): string[] {
	const descriptorsBySlug = new Map((attributes ?? []).map((descriptor) => [descriptor.slug, descriptor]));
	const labels: string[] = [];
	for (const attributeSlug of Object.keys(variant.attributes ?? {})) {
		const raw = variant.attributes[attributeSlug];
		const value = Array.isArray(raw) ? raw[0] : raw;
		if (!value) {
			continue;
		}
		const display = variant.attributeDisplay?.[attributeSlug];
		if (display?.trim()) {
			labels.push(display.trim());
			continue;
		}
		const descriptor = descriptorsBySlug.get(attributeSlug);
		labels.push(resolveOptionLabel(descriptor, value));
	}
	return labels;
}

function buildPriceLead(minPrice: number | null, maxPrice: number | null): string {
	if (minPrice === null || maxPrice === null) {
		return "";
	}
	if (minPrice === maxPrice) {
		return formatPrice(minPrice);
	}
	return `from ${formatPrice(minPrice)}`;
}

export function buildProductSeoFacts(
	product: Product,
	storeName: string,
	context: ProductSeoFactsContext = {},
	categoryLabel = "",
): ProductSeoFacts {
	const brandName = product.brandName.trim();
	const productName = product.name.trim();
	const baseTitle = `${brandName} ${productName}`.trim();
	const inStockVariants = product.variants.filter((variant) => isVariantInStock(variant));
	const pricedVariants = inStockVariants.length > 0 ? inStockVariants : product.variants;

	const prices = pricedVariants.map((variant) => variant.priceRupees).filter((price) => price > 0);
	const minPriceRupees = prices.length > 0 ? Math.min(...prices) : null;
	const maxPriceRupees = prices.length > 0 ? Math.max(...prices) : null;

	const gradeSlugsInStock = [...new Set(inStockVariants.map((variant) => variant.gradeSlug).filter(Boolean))];
	const gradesInStock = gradeSlugsInStock.map((slug) => resolveGradeLabel(slug, context.gradeLabels));
	const gradeList = gradesInStock.join(" & ");

	return {
		baseTitle,
		brandName,
		productName,
		categoryLabel,
		storeName,
		minPriceRupees,
		maxPriceRupees,
		priceLead: buildPriceLead(minPriceRupees, maxPriceRupees),
		gradeList,
		gradesInStock,
		topAttributesSummary: buildTopAttributesSummary(product, inStockVariants.length > 0 ? inStockVariants : product.variants, context.attributes),
		inStockVariantCount: inStockVariants.length,
		totalVariantCount: product.variants.length,
	};
}

export function buildProductSeoTitle(facts: ProductSeoFacts): string {
	const { baseTitle, priceLead, gradeList, topAttributesSummary, storeName, inStockVariantCount } = facts;

	if (inStockVariantCount > 0 && priceLead && gradeList) {
		return truncateSerpTitle(`${baseTitle} ${priceLead} — ${gradeList} | ${storeName}`);
	}
	if (inStockVariantCount > 0 && topAttributesSummary) {
		return truncateSerpTitle(`${baseTitle} — ${topAttributesSummary} in stock | ${storeName}`);
	}
	if (gradeList) {
		return truncateSerpTitle(`${baseTitle} (${gradeList}) | ${storeName}`);
	}
	return truncateSerpTitle(`${baseTitle} | ${storeName}`);
}

export function buildProductSeoDescription(facts: ProductSeoFacts): string {
	const { baseTitle, priceLead, gradeList, topAttributesSummary, storeName, inStockVariantCount } = facts;
	const sentences: string[] = [`Shop ${baseTitle}`];

	if (priceLead) {
		sentences.push(`${priceLead}.`);
	}
	if (inStockVariantCount > 0 && gradeList) {
		sentences.push(`${gradeList} available.`);
	}
	if (topAttributesSummary) {
		sentences.push(`${topAttributesSummary}.`);
	}
	sentences.push(`Warranty and graded inspection at ${storeName}.`);

	return truncateSerpDescription(sentences.join(" "));
}

/** Runtime title for a specific variant (sharing / non-indexable PDP URLs). */
export function buildVariantSeoTitle(
	product: Product,
	variant: Variant,
	storeName: string,
	context: ProductSeoFactsContext = {},
): string {
	const gradeLabel = resolveGradeLabel(variant.gradeSlug, context.gradeLabels);
	const attributeLabels = buildVariantAttributeLabels(variant, context.attributes);
	const price = variant.priceRupees > 0 ? formatPrice(variant.priceRupees) : "";
	const baseTitle = `${product.brandName.trim()} ${product.name.trim()}`.trim();
	const configLead = attributeLabels.length > 0 ? `${gradeLabel}, ${attributeLabels.slice(0, 3).join(", ")}` : gradeLabel;
	const priceSegment = price ? ` ${price}` : "";
	return truncateSerpTitle(`${baseTitle} (${configLead})${priceSegment} | ${storeName}`);
}

/** Runtime description for a specific variant (sharing / non-indexable PDP URLs). */
export function buildVariantSeoDescription(
	product: Product,
	variant: Variant,
	storeName: string,
	context: ProductSeoFactsContext = {},
): string {
	const gradeLabel = resolveGradeLabel(variant.gradeSlug, context.gradeLabels);
	const attributeLabels = buildVariantAttributeLabels(variant, context.attributes);
	const price = variant.priceRupees > 0 ? formatPrice(variant.priceRupees) : "";
	const attributeLead = attributeLabels.length > 0 ? ` ${attributeLabels.join(", ")}.` : "";
	const priceLead = price ? ` ${price}.` : "";
	return truncateSerpDescription(
		`Used ${product.brandName.trim()} ${product.name.trim()} in ${gradeLabel}.${attributeLead}${priceLead} Graded inspection and warranty at ${storeName}.`,
	);
}

export function deriveProductFocusKeyword(productName: string, categoryLabel: string | undefined): string {
	const parts = [productName.trim(), categoryLabel?.trim() ?? ""].filter(Boolean);
	return parts.join(" ");
}

export const DEFAULT_PRODUCT_TITLE_TEMPLATE = "{title} | {storeName}";

/** Placeholders for admin `titleTemplate` on product pages (`{minPrice}`, `{gradeList}`, etc.). */
export function buildProductTitleTemplateVars(facts: ProductSeoFacts): Record<string, string> {
	return {
		title: facts.baseTitle,
		brandName: facts.brandName,
		productName: facts.productName,
		categoryLabel: facts.categoryLabel,
		minPrice: facts.minPriceRupees !== null ? formatPrice(facts.minPriceRupees) : "",
		maxPrice: facts.maxPriceRupees !== null ? formatPrice(facts.maxPriceRupees) : "",
		priceLead: facts.priceLead,
		gradeList: facts.gradeList,
		topAttributes: facts.topAttributesSummary,
	};
}
