/** Glossary landing URLs (category-scoped grade/attribute slugs). */

export function gradeGlossaryHref(categorySlug: string, gradeSlug: string): string {
	return `/grades/${categorySlug}/${gradeSlug}`;
}

export function attributeGlossaryHref(categorySlug: string, attributeSlug: string): string {
	return `/attributes/${categorySlug}/${attributeSlug}`;
}

export function gradeGlossaryAbsoluteUrl(siteUrl: string, categorySlug: string, gradeSlug: string): string {
	const origin = siteUrl.replace(/\/$/, "");
	return `${origin}${gradeGlossaryHref(categorySlug, gradeSlug)}`;
}

export function attributeGlossaryAbsoluteUrl(siteUrl: string, categorySlug: string, attributeSlug: string): string {
	const origin = siteUrl.replace(/\/$/, "");
	return `${origin}${attributeGlossaryHref(categorySlug, attributeSlug)}`;
}
