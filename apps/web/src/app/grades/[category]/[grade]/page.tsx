import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getGradeGlossaryEntryCached, getGradesCached, getProductsPageCached } from "@/lib/core/cached";
import { categoryHref } from "@/lib/catalog/productPaths";
import { SHOP_CATEGORY_GRID_CLASS, SHOP_CATEGORY_PAGE_CLASS } from "@/lib/catalog/shopListingGrid";
import { ShopProductGrid } from "@/components/shared/ShopProductGrid";
import { StructuredContentFull } from "@/components/shared/StructuredContent";
import { composeGradeGlossarySeo } from "@/lib/seo/composeSeoMeta";
import { getSeoSettings } from "@/lib/seo/seoSettings";
import {
	breadcrumbJsonLd,
	buildGlossaryFaqJsonLd,
	glossaryCollectionJsonLd,
	glossaryDefinedTermJsonLd,
	jsonLdScriptContent,
} from "@/lib/seo/jsonLd";
import { gradeGlossaryAbsoluteUrl } from "@/lib/catalog/glossaryPaths";
import { getStorefrontBaseUrl } from "@/lib/core/baseUrl";

export const revalidate = 60;

interface GradeGlossaryPageProps {
	params: Promise<{ category: string; grade: string }>;
}

export async function generateStaticParams() {
	try {
		const grades = await getGradesCached();
		return grades.map((grade) => ({ category: grade.categorySlug, grade: grade.slug }));
	} catch {
		return [];
	}
}

export async function generateMetadata({ params }: GradeGlossaryPageProps): Promise<Metadata> {
	const { category, grade } = await params;
	const entry = await getGradeGlossaryEntryCached(category, grade);
	if (!entry) {
		return { title: "Grade glossary" };
	}
	const seoSettings = await getSeoSettings();
	const resolved = composeGradeGlossarySeo({
		grade: entry,
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

export default async function GradeGlossaryPage({ params }: GradeGlossaryPageProps) {
	const { category, grade } = await params;
	const entry = await getGradeGlossaryEntryCached(category, grade);
	if (!entry) {
		notFound();
	}

	const [productPage, seoSettings, baseUrl] = await Promise.all([
		getProductsPageCached({
			categorySlug: entry.categorySlug,
			gradeSlugs: [entry.slug],
			inStockOnly: true,
			limit: 24,
		}),
		getSeoSettings(),
		getStorefrontBaseUrl(),
	]);

	const resolved = composeGradeGlossarySeo({
		grade: entry,
		categoryLabel: entry.categoryLabel,
		settings: seoSettings,
		seo: entry.seo,
	});
	const pageUrl = gradeGlossaryAbsoluteUrl(seoSettings.siteUrl, entry.categorySlug, entry.slug);
	const shopGradeHref = `${categoryHref(entry.categorySlug)}?grade=${encodeURIComponent(entry.slug)}`;

	const definedTerm = glossaryDefinedTermJsonLd({
		name: entry.label,
		description: resolved.description,
		url: pageUrl,
		termSetName: `${seoSettings.siteName} condition grades`,
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
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-500)]">Condition grade</p>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink-900)] md:text-4xl">What is {entry.label}?</h1>
					<p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-600)] md:text-base">{resolved.description}</p>
					<div className="mt-5 flex flex-wrap gap-3">
						<Link href={shopGradeHref} className="tap inline-flex items-center rounded-[var(--radius-full)] bg-[var(--color-accent-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-700)]">
							Shop {entry.label} {entry.categoryLabel}
						</Link>
						<Link href={categoryHref(entry.categorySlug)} className="tap text-sm font-medium text-[var(--color-ink-600)] underline-offset-2 hover:text-[var(--color-ink-900)] hover:underline">
							All {entry.categoryLabel}
						</Link>
					</div>
				</header>

				<section className="reveal mt-8 max-w-3xl">
					<StructuredContentFull
						content={entry.content}
						fallback={entry.notes}
						className="prose-sm max-w-none text-[var(--color-ink-700)]"
					/>
				</section>

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
						{productPage.total} {productPage.total === 1 ? "product" : "products"} in {entry.label}
					</p>
					<div className="mt-6">
						<ShopProductGrid products={productPage.products} categoryLabel={entry.categoryLabel} priorityCount={4} gridClassName={SHOP_CATEGORY_GRID_CLASS} />
					</div>
				</section>
			</div>
		</>
	);
}
