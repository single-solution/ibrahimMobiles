import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAttributeGlossaryEntryCached, getAttributesCached, getProductsPageCached } from "@/lib/core/cached";
import { categoryHref } from "@/lib/catalog/productPaths";
import { SHOP_CATEGORY_GRID_CLASS, SHOP_CATEGORY_PAGE_CLASS } from "@/lib/catalog/shopListingGrid";
import { ShopProductGrid } from "@/components/shared/ShopProductGrid";
import { composeAttributeGlossarySeo } from "@/lib/seo/composeSeoMeta";
import { getSeoSettings } from "@/lib/seo/seoSettings";
import {
	breadcrumbJsonLd,
	buildGlossaryFaqJsonLd,
	glossaryCollectionJsonLd,
	glossaryDefinedTermJsonLd,
	jsonLdScriptContent,
} from "@/lib/seo/jsonLd";
import { attributeGlossaryAbsoluteUrl } from "@/lib/catalog/glossaryPaths";
import { getStorefrontBaseUrl } from "@/lib/core/baseUrl";

export const revalidate = 60;

interface AttributeGlossaryPageProps {
	params: Promise<{ category: string; attribute: string }>;
}

export async function generateStaticParams() {
	try {
		const attributes = await getAttributesCached();
		return attributes.map((attribute) => ({ category: attribute.categorySlug, attribute: attribute.slug }));
	} catch {
		return [];
	}
}

export async function generateMetadata({ params }: AttributeGlossaryPageProps): Promise<Metadata> {
	const { category, attribute } = await params;
	const entry = await getAttributeGlossaryEntryCached(category, attribute);
	if (!entry) {
		return { title: "Attribute glossary" };
	}
	const seoSettings = await getSeoSettings();
	const resolved = composeAttributeGlossarySeo({
		attribute: {
			...entry,
			optionLabels: entry.options.map((option) => option.label),
		},
		categoryLabel: entry.categoryLabel,
		settings: seoSettings,
		seo: entry.seo,
	});
	return {
		title: resolved.title,
		description: resolved.description,
		alternates: { canonical: resolved.canonical },
		robots: resolved.robots,
		openGraph: {
			title: resolved.title,
			description: resolved.description,
			url: resolved.canonical,
			type: "article",
		},
	};
}

export default async function AttributeGlossaryPage({ params }: AttributeGlossaryPageProps) {
	const { category, attribute } = await params;
	const entry = await getAttributeGlossaryEntryCached(category, attribute);
	if (!entry) {
		notFound();
	}

	const [productPage, seoSettings, baseUrl] = await Promise.all([
		getProductsPageCached({
			categorySlug: entry.categorySlug,
			attributeAxisSlug: entry.slug,
			inStockOnly: true,
			limit: 24,
		}),
		getSeoSettings(),
		getStorefrontBaseUrl(),
	]);

	const resolved = composeAttributeGlossarySeo({
		attribute: {
			...entry,
			optionLabels: entry.options.map((option) => option.label),
		},
		categoryLabel: entry.categoryLabel,
		settings: seoSettings,
		seo: entry.seo,
	});
	const pageUrl = attributeGlossaryAbsoluteUrl(seoSettings.siteUrl, entry.categorySlug, entry.slug);
	const optionSummary = entry.options.map((option) => option.label).join(", ");

	const definedTerm = glossaryDefinedTermJsonLd({
		name: entry.label,
		description: resolved.description,
		url: pageUrl,
		termSetName: `${seoSettings.siteName} ${entry.categoryLabel} attributes`,
	});
	const collection = glossaryCollectionJsonLd({
		name: `${entry.label} — ${entry.categoryLabel}`,
		url: pageUrl,
		products: productPage.products,
		settings: seoSettings,
	});
	const faqJsonLd = buildGlossaryFaqJsonLd(entry.seo?.faqs);
	const breadcrumbs = breadcrumbJsonLd([
		{ name: "Home", url: baseUrl },
		{ name: entry.categoryLabel, url: `${baseUrl}${categoryHref(entry.categorySlug)}` },
		{ name: entry.label, url: pageUrl },
	]);

	return (
		<>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(definedTerm) }} />
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(collection) }} />
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(breadcrumbs) }} />
			{faqJsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(faqJsonLd) }} /> : null}

			<div className={`${SHOP_CATEGORY_PAGE_CLASS} pb-10 md:pb-20`}>
				<header className="reveal reveal-rise border-b border-[var(--color-ink-100)] pb-8 pt-6 md:pt-10">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-500)]">Product attribute</p>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink-900)] md:text-4xl">What is {entry.label}?</h1>
					<p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-600)] md:text-base">{resolved.description}</p>
					{optionSummary ? (
						<p className="mt-2 text-sm text-[var(--color-ink-500)]">
							Options: {optionSummary}
							{entry.unit ? ` ${entry.unit}` : ""}
						</p>
					) : null}
					<div className="mt-5">
						<Link href={categoryHref(entry.categorySlug)} className="tap text-sm font-medium text-[var(--color-ink-600)] underline-offset-2 hover:text-[var(--color-ink-900)] hover:underline">
							Browse {entry.categoryLabel}
						</Link>
					</div>
				</header>

				{entry.seo?.faqs && entry.seo.faqs.length > 0 ? (
					<section className="reveal mt-10 max-w-3xl">
						<h2 className="text-lg font-semibold text-[var(--color-ink-900)]">Common questions</h2>
						<dl className="mt-4 space-y-4">
							{entry.seo.faqs.map((faq) => (
								<div key={faq.question}>
									<dt className="font-medium text-[var(--color-ink-900)]">{faq.question}</dt>
									<dd className="mt-1 text-sm leading-relaxed text-[var(--color-ink-600)]">{faq.answer}</dd>
								</div>
							))}
						</dl>
					</section>
				) : null}

				<section className="reveal mt-12">
					<h2 className="text-lg font-semibold text-[var(--color-ink-900)]">In stock now</h2>
					<p className="mt-1 text-sm text-[var(--color-ink-500)]">
						{productPage.total} {productPage.total === 1 ? "product" : "products"} with {entry.label.toLowerCase()}
					</p>
					<div className="mt-6">
						<ShopProductGrid products={productPage.products} categoryLabel={entry.categoryLabel} priorityCount={4} gridClassName={SHOP_CATEGORY_GRID_CLASS} />
					</div>
				</section>
			</div>
		</>
	);
}
