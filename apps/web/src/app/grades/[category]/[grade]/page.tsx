import { redirect } from "next/navigation";

import { categoryHref } from "@/lib/catalog/productPaths";
import { FILTER_PARAM_KEYS } from "@/lib/core/filterParams";

interface GradeGlossaryPageProps {
	params: Promise<{ category: string; grade: string }>;
}

/**
 * Legacy SEO glossary URL — send shoppers to the category listing filtered
 * by grade instead of a standalone glossary article.
 */
export default async function GradeGlossaryPage({ params }: GradeGlossaryPageProps) {
	const { category, grade } = await params;
	redirect(`${categoryHref(category)}?${FILTER_PARAM_KEYS.grades}=${encodeURIComponent(grade)}`);
}
