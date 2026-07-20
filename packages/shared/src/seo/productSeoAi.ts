/**
 * Layer 2 product SEO — prompt + response parsing (no network I/O).
 */

import type { ProductFaqEntry } from "./productSeoFaq";
import type { ProductSeoFacts } from "./productSeoFacts";
import { truncateSerpDescription, truncateSerpTitle } from "./productSeoFacts";

export const SEO_PRODUCT_PROMPT_VERSION = "product-seo-v1";

export interface ProductSeoAiGradeNote {
	label: string;
	notes: string;
}

export interface ProductSeoAiResult {
	title: string;
	description: string;
	faqs: ProductFaqEntry[];
	promptVersion: string;
}

export interface ProductSeoAiGenerationMeta {
	aiGeneratedAt: string;
	aiModelId: string;
}

function clampFaqAnswer(answer: string): string {
	const trimmed = answer.trim();
	if (trimmed.length <= 320) {
		return trimmed;
	}
	const slice = trimmed.slice(0, 320);
	const lastSpace = slice.lastIndexOf(" ");
	return lastSpace > 120 ? `${slice.slice(0, lastSpace).trimEnd()}…` : `${slice.trimEnd()}…`;
}

export function buildProductSeoAiPrompt(input: {
	facts: ProductSeoFacts;
	formulaTitle: string;
	formulaDescription: string;
	categoryLabel: string;
	gradeNotes: ProductSeoAiGradeNote[];
	storeName: string;
}): string {
	const { facts, formulaTitle, formulaDescription, categoryLabel, gradeNotes, storeName } = input;
	const factsBlock = [
		`Product: ${facts.baseTitle}`,
		`Category: ${categoryLabel || "n/a"}`,
		`Store: ${storeName}`,
		facts.priceLead ? `Price: ${facts.priceLead}` : null,
		facts.gradeList ? `Grades in stock: ${facts.gradeList}` : null,
		facts.topAttributesSummary ? `Configurations: ${facts.topAttributesSummary}` : null,
		`In-stock configurations: ${facts.inStockVariantCount}`,
	].filter(Boolean);

	const gradeBlock =
		gradeNotes.length > 0
			? gradeNotes.map((grade) => `- ${grade.label}: ${grade.notes.trim().slice(0, 240)}`).join("\n")
			: "No grade notes provided.";

	return [
		"You write SEO metadata for a graded electronics storefront in Pakistan.",
		"Use ONLY the facts below. Do not invent specs, prices, colors, storage, or warranty terms.",
		"Plain ASCII only. No emojis. No marketing fluff.",
		`Title max ${60} characters. Description max ${160} characters.`,
		"Return JSON only:",
		'{"title":"...","description":"...","faqs":[{"question":"...","answer":"..."}]}',
		"Include 3 to 5 FAQ objects. Questions must be useful for search and AI answers.",
		"",
		"Facts:",
		factsBlock.join("\n"),
		"",
		"Formula fallback (improve wording, do not change facts):",
		`Title: ${formulaTitle}`,
		`Description: ${formulaDescription}`,
		"",
		"Grade notes:",
		gradeBlock,
	].join("\n");
}

function extractJsonObject(raw: string): string | null {
	const trimmed = raw.trim();
	if (trimmed.startsWith("{")) {
		return trimmed;
	}
	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
	if (fenced?.[1]) {
		return fenced[1].trim();
	}
	const start = trimmed.indexOf("{");
	const end = trimmed.lastIndexOf("}");
	if (start >= 0 && end > start) {
		return trimmed.slice(start, end + 1);
	}
	return null;
}

export function parseProductSeoAiResponse(raw: string): ProductSeoAiResult | null {
	const jsonText = extractJsonObject(raw);
	if (!jsonText) {
		return null;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonText);
	} catch {
		return null;
	}

	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		return null;
	}

	const record = parsed as Record<string, unknown>;
	const title = typeof record.title === "string" ? truncateSerpTitle(record.title) : "";
	const description = typeof record.description === "string" ? truncateSerpDescription(record.description) : "";
	if (!title || !description) {
		return null;
	}

	const faqs: ProductFaqEntry[] = [];
	if (Array.isArray(record.faqs)) {
		for (const entry of record.faqs) {
			if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
				continue;
			}
			const row = entry as Record<string, unknown>;
			const question = typeof row.question === "string" ? row.question.trim().slice(0, 200) : "";
			const answer = typeof row.answer === "string" ? clampFaqAnswer(row.answer) : "";
			if (!question || !answer) {
				continue;
			}
			faqs.push({ question, answer });
			if (faqs.length >= 8) {
				break;
			}
		}
	}

	return {
		title,
		description,
		faqs,
		promptVersion: SEO_PRODUCT_PROMPT_VERSION,
	};
}
