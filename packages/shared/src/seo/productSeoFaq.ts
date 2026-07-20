import { formatPrice } from "../formatters";
import { formatWarrantyPeriod, resolveWarrantyDays } from "../warranty";
import type { ProductSeoFacts } from "./productSeoFacts";

export interface ProductFaqEntry {
	question: string;
	answer: string;
}

export interface ProductFaqGradeRef {
	slug: string;
	label: string;
	notes: string;
}

const FAQ_ANSWER_MAX = 320;

function truncateFaqAnswer(answer: string): string {
	const trimmed = answer.trim();
	if (trimmed.length <= FAQ_ANSWER_MAX) {
		return trimmed;
	}
	const slice = trimmed.slice(0, FAQ_ANSWER_MAX);
	const lastSpace = slice.lastIndexOf(" ");
	return lastSpace > 120 ? `${slice.slice(0, lastSpace).trimEnd()}…` : `${slice.trimEnd()}…`;
}

export function buildProductFaqEntries(
	facts: ProductSeoFacts,
	options: {
		grades?: ProductFaqGradeRef[];
		maxWarrantyDays?: number;
	} = {},
): ProductFaqEntry[] {
	const entries: ProductFaqEntry[] = [];

	if (facts.gradesInStock.length > 0) {
		entries.push({
			question: `What grades are available for the ${facts.baseTitle}?`,
			answer: truncateFaqAnswer(`${facts.gradeList} ${facts.gradesInStock.length === 1 ? "is" : "are"} in stock at ${facts.storeName}.`),
		});
	}

	if (facts.priceLead) {
		const priceAnswer =
			facts.minPriceRupees !== null && facts.maxPriceRupees !== null && facts.minPriceRupees !== facts.maxPriceRupees
				? `Prices range from ${formatPrice(facts.minPriceRupees)} to ${formatPrice(facts.maxPriceRupees)} depending on grade and configuration.`
				: `The current price is ${facts.priceLead}.`;
		entries.push({
			question: `What is the price of the ${facts.baseTitle}?`,
			answer: truncateFaqAnswer(priceAnswer),
		});
	}

	if (facts.topAttributesSummary) {
		entries.push({
			question: `What configurations are available for the ${facts.baseTitle}?`,
			answer: truncateFaqAnswer(`Available options include ${facts.topAttributesSummary}.`),
		});
	}

	const warrantyDays = options.maxWarrantyDays ?? 0;
	if (warrantyDays > 0) {
		entries.push({
			question: `What warranty is included with the ${facts.baseTitle}?`,
			answer: truncateFaqAnswer(`Units include up to ${formatWarrantyPeriod(warrantyDays)} warranty with graded inspection at ${facts.storeName}.`),
		});
	}

	const stockedGradeSlugs = new Set(
		options.grades?.filter((grade) => facts.gradesInStock.some((label) => label === grade.label)).map((grade) => grade.slug) ?? [],
	);

	for (const grade of options.grades ?? []) {
		if (!stockedGradeSlugs.has(grade.slug) || !grade.notes.trim()) {
			continue;
		}
		if (entries.length >= 8) {
			break;
		}
		entries.push({
			question: `What does ${grade.label} condition mean for the ${facts.baseTitle}?`,
			answer: truncateFaqAnswer(grade.notes),
		});
	}

	return entries.slice(0, 8);
}

export function maxWarrantyDaysForVariants(variants: Array<{ warrantyDays?: number }>): number {
	let maxDays = 0;
	for (const variant of variants) {
		maxDays = Math.max(maxDays, resolveWarrantyDays(variant));
	}
	return maxDays;
}
