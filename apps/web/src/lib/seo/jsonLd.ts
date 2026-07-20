/**
 * Schema.org JSON-LD generators. Used by every public storefront page
 * to publish structured data Google + Bing pick up for rich snippets.
 */

import type { AttributeDescriptor, GradeDescriptor, Product, ProductFaqEntry, ProductSeoFacts, Variant } from "@store/shared";
import {
	buildProductFaqEntries,
	buildProductSeoDescription,
	buildProductSeoFacts,
	isVariantInStock,
	maxWarrantyDaysForVariants,
} from "@store/shared";

import { categoryHref, productAbsoluteUrl } from "@/lib/catalog/productPaths";
import { selectionFromVariant } from "@/lib/catalog/pdpSelection";
import { getDefaultVariant } from "@/lib/productSummary";

interface SeoSettings {
	siteName: string;
	siteTagline: string;
	siteUrl: string;
}

interface CategoryRef {
	slug: string;
	label: string;
}

interface BrandRef {
	slug: string;
	name: string;
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

function resolveAttributeSnippet(variant: Variant, attributes: AttributeDescriptor[] | undefined): string {
	if (!attributes || attributes.length === 0) {
		return "";
	}
	const descriptorsBySlug = new Map(attributes.map((descriptor) => [descriptor.slug, descriptor]));
	const parts: string[] = [];
	for (const attributeSlug of Object.keys(variant.attributes ?? {})) {
		const descriptor = descriptorsBySlug.get(attributeSlug);
		const raw = variant.attributes[attributeSlug];
		const value = Array.isArray(raw) ? raw[0] : raw;
		if (!value) {
			continue;
		}
		const label = descriptor?.options.find((option) => option.value === value)?.label ?? value;
		parts.push(label);
	}
	return parts.slice(0, 3).join(", ");
}

function buildVariantDisplayName(
	product: Product,
	variant: Variant,
	brandName: string,
	gradeLabels: Record<string, string> | undefined,
	attributes: AttributeDescriptor[] | undefined,
): string {
	const gradeLabel = resolveGradeLabel(variant.gradeSlug, gradeLabels);
	const attributeSnippet = resolveAttributeSnippet(variant, attributes);
	const base = `${brandName} ${product.name}`.trim();
	if (attributeSnippet) {
		return `${base} (${gradeLabel}, ${attributeSnippet})`;
	}
	return `${base} (${gradeLabel})`;
}

function variantOffer(variant: Variant, offerUrl: string): Record<string, unknown> {
	return {
		"@type": "Offer",
		url: offerUrl,
		priceCurrency: "PKR",
		price: variant.priceRupees,
		availability: isVariantInStock(variant) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
		itemCondition: "https://schema.org/UsedCondition",
	};
}

/* --------------------------------------------------------------------------
 * Product JSON-LD (ProductGroup + hasVariant)
 * ------------------------------------------------------------------------ */

export function productJsonLd({
	product,
	brand,
	category,
	settings,
	gradeLabels,
	attributes,
	facts,
}: {
	product: Product;
	brand: BrandRef | null;
	category: CategoryRef | null;
	settings: SeoSettings;
	gradeLabels?: Record<string, string>;
	attributes?: AttributeDescriptor[];
	facts?: ProductSeoFacts;
}): Record<string, unknown> {
	const brandName = brand?.name ?? product.brandName;
	const canonicalUrl = productAbsoluteUrl(settings.siteUrl, product);
	const heroImage = product.images?.[0];
	const images = product.images.map((image) => image?.variants?.detail || image?.variants?.full).filter((url): url is string => typeof url === "string");
	const resolvedFacts = facts ?? buildProductSeoFacts(product, settings.siteName, { gradeLabels, attributes }, category?.label ?? "");
	const description = buildProductSeoDescription(resolvedFacts);
	const variantsForSchema = product.variants.length > 0 ? product.variants : [];

	const inStockVariants = variantsForSchema.filter((variant) => isVariantInStock(variant));
	const schemaVariants = inStockVariants.length > 0 ? inStockVariants : variantsForSchema;

	const hasVariant = schemaVariants.map((variant) => {
		const selection = selectionFromVariant(variant);
		const variantUrl = productAbsoluteUrl(settings.siteUrl, product, { selection });
		return {
			"@type": "Product",
			sku: variant.id,
			name: buildVariantDisplayName(product, variant, brandName, gradeLabels, attributes),
			url: variantUrl,
			offers: variantOffer(variant, variantUrl),
		};
	});

	const aggregateOffer: Record<string, unknown> = {
		"@type": "AggregateOffer",
		priceCurrency: "PKR",
		offerCount: schemaVariants.length,
		url: canonicalUrl,
	};
	if (resolvedFacts.minPriceRupees !== null) {
		aggregateOffer.lowPrice = resolvedFacts.minPriceRupees;
	}
	if (resolvedFacts.maxPriceRupees !== null) {
		aggregateOffer.highPrice = resolvedFacts.maxPriceRupees;
	}

	const jsonLd: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "ProductGroup",
		productGroupID: product.id,
		name: resolvedFacts.baseTitle,
		description,
		url: canonicalUrl,
		image: images.length > 0 ? images : heroImage ? [heroImage.variants.detail] : undefined,
		brand: brandName ? { "@type": "Brand", name: brandName } : undefined,
		category: category?.label,
		offers: aggregateOffer,
	};

	if (hasVariant.length > 0) {
		jsonLd.hasVariant = hasVariant;
	}

	return jsonLd;
}

/* --------------------------------------------------------------------------
 * Glossary JSON-LD (DefinedTerm + CollectionPage ItemList)
 * ------------------------------------------------------------------------ */

export function glossaryDefinedTermJsonLd(input: {
	name: string;
	description: string;
	url: string;
	termSetName: string;
}): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "DefinedTerm",
		name: input.name,
		description: input.description,
		url: input.url,
		inDefinedTermSet: {
			"@type": "DefinedTermSet",
			name: input.termSetName,
		},
	};
}

export function glossaryCollectionJsonLd(input: {
	name: string;
	url: string;
	products: Product[];
	settings: SeoSettings;
}): Record<string, unknown> {
	const items = input.products.slice(0, 24).map((product, index) => ({
		"@type": "ListItem",
		position: index + 1,
		url: productAbsoluteUrl(input.settings.siteUrl, product, {
			variant: getDefaultVariant(product),
		}),
		name: `${product.brandName} ${product.name}`,
	}));

	return {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name: input.name,
		url: input.url,
		mainEntity: {
			"@type": "ItemList",
			itemListElement: items,
		},
	};
}

export function buildGlossaryFaqJsonLd(faqs: Array<{ question: string; answer: string }> | undefined): Record<string, unknown> | null {
	if (!faqs || faqs.length === 0) {
		return null;
	}
	return faqPageJsonLd(faqs);
}

/* --------------------------------------------------------------------------
 * FAQPage JSON-LD
 * ------------------------------------------------------------------------ */

export function faqPageJsonLd(entries: ProductFaqEntry[]): Record<string, unknown> | null {
	if (entries.length === 0) {
		return null;
	}
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: entries.map((entry) => ({
			"@type": "Question",
			name: entry.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: entry.answer,
			},
		})),
	};
}

export function buildProductFaqJsonLd(
	product: Product,
	settings: SeoSettings,
	options: {
		categoryLabel?: string;
		gradeLabels?: Record<string, string>;
		attributes?: AttributeDescriptor[];
		grades?: GradeDescriptor[];
		maxWarrantyDays?: number;
	},
): Record<string, unknown> | null {
	const facts = buildProductSeoFacts(product, settings.siteName, options, options.categoryLabel ?? "");
	const gradeRefs =
		options.grades?.map((grade) => ({
			slug: grade.slug,
			label: grade.label,
			notes: grade.notes,
		})) ?? [];
	const entries = buildProductFaqEntries(facts, {
		grades: gradeRefs,
		maxWarrantyDays: options.maxWarrantyDays ?? maxWarrantyDaysForVariants(product.variants),
	});
	return faqPageJsonLd(entries);
}

/* --------------------------------------------------------------------------
 * BreadcrumbList JSON-LD
 * ------------------------------------------------------------------------ */

export function breadcrumbJsonLd(crumbs: { name: string; url: string }[]): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: crumbs.map((crumb, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: crumb.name,
			item: crumb.url,
		})),
	};
}

/* --------------------------------------------------------------------------
 * CollectionPage JSON-LD (category landings)
 * ------------------------------------------------------------------------ */

export function collectionPageJsonLd({
	category,
	products,
	settings,
	pageUrl,
	pageName,
}: {
	category: CategoryRef;
	products: Product[];
	settings: SeoSettings;
	pageUrl?: string;
	pageName?: string;
}): Record<string, unknown> {
	const url = pageUrl ?? `${settings.siteUrl}${categoryHref(category.slug)}`;
	const name = pageName ?? `${category.label} — ${settings.siteName}`;
	const items = products.slice(0, 24).map((product, index) => ({
		"@type": "ListItem",
		position: index + 1,
		url: productAbsoluteUrl(settings.siteUrl, product, {
			variant: getDefaultVariant(product),
		}),
		name: `${product.brandName} ${product.name}`,
	}));

	return {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name,
		url,
		mainEntity: {
			"@type": "ItemList",
			itemListElement: items,
		},
	};
}

/* --------------------------------------------------------------------------
 * Organization + WebSite JSON-LD (home)
 * ------------------------------------------------------------------------ */

export function organizationJsonLd(
	settings: SeoSettings & {
		contactPhone?: string;
		contactEmail?: string;
		logoUrl?: string;
		sameAs?: string[];
		address?: {
			street?: string;
			city?: string;
			region?: string;
			postalCode?: string;
			country?: string;
		};
	},
): Record<string, unknown> {
	const jsonLd: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: settings.siteName,
		url: settings.siteUrl,
		description: settings.siteTagline,
	};
	if (settings.logoUrl) {
		jsonLd.logo = settings.logoUrl;
	}
	if (settings.sameAs && settings.sameAs.length > 0) {
		jsonLd.sameAs = settings.sameAs;
	}
	if (settings.address?.street?.trim()) {
		jsonLd.address = {
			"@type": "PostalAddress",
			streetAddress: settings.address.street,
			addressLocality: settings.address.city,
			addressRegion: settings.address.region,
			postalCode: settings.address.postalCode,
			addressCountry: settings.address.country,
		};
	}
	if (settings.contactPhone || settings.contactEmail) {
		jsonLd.contactPoint = [
			{
				"@type": "ContactPoint",
				contactType: "customer service",
				telephone: settings.contactPhone,
				email: settings.contactEmail,
			},
		];
	}
	return jsonLd;
}

export function websiteJsonLd(settings: SeoSettings): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: settings.siteName,
		url: settings.siteUrl,
		potentialAction: {
			"@type": "SearchAction",
			target: `${settings.siteUrl}/?q={search_term_string}`,
			"query-input": "required name=search_term_string",
		},
	};
}

/* --------------------------------------------------------------------------
 * Convenience: pre-stringified <script> payload
 * ------------------------------------------------------------------------ */

export function jsonLdScriptContent(obj: Record<string, unknown>): string {
	return JSON.stringify(obj, (_key, value) => (value === undefined ? undefined : value)).replace(/</g, "\\u003c");
}
