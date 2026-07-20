/**
 * Layer 1 glossary SEO — formula titles/descriptions for grade and attribute pages.
 */

import { truncateSerpDescription, truncateSerpTitle } from "./productSeoFacts";

export function buildGradeGlossaryTitle(gradeLabel: string, storeName: string): string {
	return truncateSerpTitle(`What is ${gradeLabel}? | ${storeName}`);
}

export function buildGradeGlossaryDescription(input: {
	gradeLabel: string;
	gradeNotes: string;
	categoryLabel: string;
	storeName: string;
}): string {
	const { gradeLabel, gradeNotes, categoryLabel, storeName } = input;
	const notesLead = gradeNotes.trim().replace(/\s+/g, " ");
	const notesSnippet = notesLead.length > 0 ? `${notesLead.slice(0, 120)}${notesLead.length > 120 ? "…" : ""} ` : "";
	const categoryPhrase = categoryLabel.trim() || "this category";
	return truncateSerpDescription(
		`${gradeLabel} is a condition grade for ${categoryPhrase.toLowerCase()}. ${notesSnippet}Shop ${categoryPhrase} in ${gradeLabel} at ${storeName}.`,
	);
}

export function buildAttributeGlossaryTitle(attributeLabel: string, storeName: string): string {
	return truncateSerpTitle(`What is ${attributeLabel}? | ${storeName}`);
}

export function buildAttributeGlossaryDescription(input: {
	attributeLabel: string;
	optionLabels: string[];
	unit?: string;
	categoryLabel: string;
	storeName: string;
}): string {
	const { attributeLabel, optionLabels, unit, categoryLabel, storeName } = input;
	const categoryPhrase = categoryLabel.trim() || "this category";
	const unitSuffix = unit?.trim() ? ` (${unit.trim()})` : "";
	const optionsLead =
		optionLabels.length > 0
			? `Options include ${optionLabels.slice(0, 6).join(", ")}${optionLabels.length > 6 ? ", and more" : ""}. `
			: "";
	return truncateSerpDescription(
		`${attributeLabel}${unitSuffix} is a ${categoryPhrase.toLowerCase()} configuration. ${optionsLead}Browse at ${storeName}.`,
	);
}
