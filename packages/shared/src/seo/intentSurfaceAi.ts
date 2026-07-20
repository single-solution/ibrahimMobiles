/**
 * Layer 2 intent surface copy — H1 + intro (no network I/O).
 */

import { truncateSerpDescription, truncateSerpTitle } from "./productSeoFacts";
import type { IntentSurfaceComboStats } from "./intentSurface";

export const SEO_INTENT_SURFACE_PROMPT_VERSION = "intent-surface-v1";

export interface IntentSurfaceAiResult {
	headline: string;
	intro: string;
	title?: string;
	description?: string;
	promptVersion: string;
}

function clampIntro(intro: string): string {
	const trimmed = intro.trim();
	if (trimmed.length <= 600) {
		return trimmed;
	}
	const slice = trimmed.slice(0, 600);
	const lastSpace = slice.lastIndexOf(" ");
	return lastSpace > 200 ? `${slice.slice(0, lastSpace).trimEnd()}…` : `${slice.trimEnd()}…`;
}

function clampHeadline(headline: string): string {
	const trimmed = headline.trim();
	if (trimmed.length <= 120) {
		return trimmed;
	}
	return `${trimmed.slice(0, 117).trimEnd()}…`;
}

export function buildIntentSurfaceAiPrompt(input: {
	brandName: string;
	categoryLabel: string;
	gradeLabel: string;
	storeName: string;
	stats: IntentSurfaceComboStats;
	formulaTitle: string;
	formulaDescription: string;
	formulaHeadline: string;
	formulaIntro: string;
}): string {
	const { brandName, categoryLabel, gradeLabel, storeName, stats, formulaTitle, formulaDescription, formulaHeadline, formulaIntro } = input;
	const priceLine =
		typeof stats.minPriceRupees === "number"
			? typeof stats.maxPriceRupees === "number" && stats.maxPriceRupees !== stats.minPriceRupees
				? `Price range: Rs. ${stats.minPriceRupees} – Rs. ${stats.maxPriceRupees}`
				: `Price from: Rs. ${stats.minPriceRupees}`
			: null;

	return [
		"You write SEO copy for a filtered storefront listing in Pakistan (used graded electronics).",
		"Use ONLY the facts below. Do not invent specs, prices, or stock counts.",
		"Plain ASCII only. No emojis. No marketing fluff.",
		"Headline max 80 characters. Intro max 320 characters. Title max 60. Description max 160.",
		'Return JSON only: {"headline":"...","intro":"...","title":"...","description":"..."}',
		"Title and description are optional — improve the formula fallbacks when helpful.",
		"",
		`Brand: ${brandName}`,
		`Category: ${categoryLabel}`,
		`Grade: ${gradeLabel}`,
		`Store: ${storeName}`,
		`Products: ${stats.productCount}`,
		`In-stock configurations: ${stats.inStockVariantCount}`,
		priceLine,
		"",
		"Formula fallbacks:",
		`Headline: ${formulaHeadline}`,
		`Intro: ${formulaIntro}`,
		`Title: ${formulaTitle}`,
		`Description: ${formulaDescription}`,
	].filter(Boolean).join("\n");
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

export function parseIntentSurfaceAiResponse(raw: string): IntentSurfaceAiResult | null {
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
	const headline = typeof record.headline === "string" ? clampHeadline(record.headline) : "";
	const intro = typeof record.intro === "string" ? clampIntro(record.intro) : "";
	if (!headline || !intro) {
		return null;
	}

	const title = typeof record.title === "string" && record.title.trim() ? truncateSerpTitle(record.title) : undefined;
	const description =
		typeof record.description === "string" && record.description.trim() ? truncateSerpDescription(record.description) : undefined;

	return {
		headline,
		intro,
		title,
		description,
		promptVersion: SEO_INTENT_SURFACE_PROMPT_VERSION,
	};
}
