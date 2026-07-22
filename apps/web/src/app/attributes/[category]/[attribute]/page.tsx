import { redirect } from "next/navigation";

import { categoryHref } from "@/lib/catalog/productPaths";

interface AttributeGlossaryPageProps {
	params: Promise<{ category: string; attribute: string }>;
}

/**
 * Legacy SEO glossary URL — send shoppers to the category listing.
 * Attribute filters need a concrete option value; the axis alone is not enough.
 */
export default async function AttributeGlossaryPage({ params }: AttributeGlossaryPageProps) {
	const { category } = await params;
	redirect(categoryHref(category));
}
