/**
 * Layer 2 glossary SEO — prompt + response parsing (no network I/O).
 */

import type { SeoFaqEntry } from "./seoMeta";
import { truncateSerpDescription, truncateSerpTitle } from "./productSeoFacts";

export const SEO_GRADE_GLOSSARY_PROMPT_VERSION = "grade-glossary-v1";
export const SEO_ATTRIBUTE_GLOSSARY_PROMPT_VERSION = "attribute-glossary-v1";

export interface GlossarySeoAiResult {
	title: string;
	description: string;
	faqs: SeoFaqEntry[];
	promptVersion: string;
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

export function buildGradeGlossaryAiPrompt(input: {
	gradeLabel: string;
	gradeNotes: string;
	categoryLabel: string;
	storeName: string;
	formulaTitle: string;
	formulaDescription: string;
}): string {
	const { gradeLabel, gradeNotes, categoryLabel, storeName, formulaTitle, formulaDescription } = input;
	return [
		"You write SEO metadata for a graded electronics glossary page in Pakistan.",
		"Explain what the condition grade means for shoppers. Use ONLY the facts below.",
		"Plain ASCII only. No emojis.",
		"Title max 60 characters. Description max 160 characters.",
		'Return JSON only: {"title":"...","description":"...","faqs":[{"question":"...","answer":"..."}]}',
		"Include 3 to 5 FAQ objects useful for search and AI answers.",
		"",
		`Grade: ${gradeLabel}`,
		`Category: ${categoryLabel || "n/a"}`,
		`Store: ${storeName}`,
		`Admin notes: ${gradeNotes.trim().slice(0, 400) || "No notes."}`,
		"",
		"Formula fallback (improve wording, do not invent specs):",
		`Title: ${formulaTitle}`,
		`Description: ${formulaDescription}`,
	].join("\n");
}

export function buildAttributeGlossaryAiPrompt(input: {
	attributeLabel: string;
	unit?: string;
	optionLabels: string[];
	categoryLabel: string;
	storeName: string;
	formulaTitle: string;
	formulaDescription: string;
}): string {
	const { attributeLabel, unit, optionLabels, categoryLabel, storeName, formulaTitle, formulaDescription } = input;
	const optionsBlock = optionLabels.length > 0 ? optionLabels.join(", ") : "No options listed.";
	return [
		"You write SEO metadata for a product attribute glossary page in Pakistan.",
		"Explain what the attribute means when shopping. Use ONLY the facts below.",
		"Plain ASCII only. No emojis.",
		"Title max 60 characters. Description max 160 characters.",
		'Return JSON only: {"title":"...","description":"...","faqs":[{"question":"...","answer":"..."}]}',
		"Include 3 to 5 FAQ objects useful for search and AI answers.",
		"",
		`Attribute: ${attributeLabel}${unit?.trim() ? ` (${unit.trim()})` : ""}`,
		`Category: ${categoryLabel || "n/a"}`,
		`Store: ${storeName}`,
		`Options: ${optionsBlock}`,
		"",
		"Formula fallback (improve wording, do not invent specs):",
		`Title: ${formulaTitle}`,
		`Description: ${formulaDescription}`,
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

function parseGlossaryAiPayload(raw: unknown, promptVersion: string): GlossarySeoAiResult | null {
	if (!raw || typeof raw !== "object") {
		return null;
	}
	const record = raw as Record<string, unknown>;
	const title = typeof record.title === "string" ? truncateSerpTitle(record.title) : "";
	const description = typeof record.description === "string" ? truncateSerpDescription(record.description) : "";
	if (!title || !description) {
		return null;
	}
	const faqs: SeoFaqEntry[] = [];
	if (Array.isArray(record.faqs)) {
		for (const entry of record.faqs) {
			if (!entry || typeof entry !== "object") {
				continue;
			}
			const faq = entry as Record<string, unknown>;
			const question = typeof faq.question === "string" ? faq.question.trim() : "";
			const answer = typeof faq.answer === "string" ? clampFaqAnswer(faq.answer) : "";
			if (question && answer) {
				faqs.push({ question, answer });
			}
		}
	}
	return { title, description, faqs: faqs.slice(0, 8), promptVersion };
}

export function parseGradeGlossaryAiResponse(raw: string): GlossarySeoAiResult | null {
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
	return parseGlossaryAiPayload(parsed, SEO_GRADE_GLOSSARY_PROMPT_VERSION);
}

export function parseAttributeGlossaryAiResponse(raw: string): GlossarySeoAiResult | null {
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
	return parseGlossaryAiPayload(parsed, SEO_ATTRIBUTE_GLOSSARY_PROMPT_VERSION);
}
