import type { Metadata } from "next";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";

import { logger } from "@store/shared";

import { DealSpotlight } from "@/app/deals/_components/DealSpotlight";
import { DealsOfferSections } from "@/app/deals/_components/DealsOfferSections";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";
import { getStoreSettingsCached } from "@/lib/core/cached";
import { loadDealsPageContent, type DealsPageContent } from "@/lib/pricing/dealsPageContent";
import { getSeoSettings } from "@/lib/seo/seoSettings";

async function loadDealsContentSafe(): Promise<DealsPageContent> {
	try {
		return await loadDealsPageContent();
	} catch (error) {
		logger.error({ error }, "deals: content load failed, falling back to empty layout");
		return { spotlight: null, spotlightOfferBadgeLabel: null, sections: [] };
	}
}

export async function generateMetadata(): Promise<Metadata> {
	const seo = await getSeoSettings();
	const title = `Today's deals · ${seo.seoStoreName || seo.siteName}`;
	const description = seo.defaultDescription || "Live offers, weekly drops and bank-transfer discounts.";
	return {
		title,
		description,
		alternates: { canonical: `${seo.siteUrl}/deals` },
		openGraph: {
			title,
			description,
			url: `${seo.siteUrl}/deals`,
			type: "website",
			images: seo.defaultOgImageUrl ? [seo.defaultOgImageUrl] : undefined,
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: seo.defaultOgImageUrl ? [seo.defaultOgImageUrl] : undefined,
		},
	};
}

export const revalidate = 60;

const MOBILE_PRODUCT_SKELETON_COUNT = 4;
const DESKTOP_PRODUCT_SKELETON_COUNT = 4;
const SECTION_SKELETON_COUNT = 2;

function DealsHero({ subtitle }: { subtitle: string }) {
	return (
		<>
			<div className="app-page pb-0 pt-3 md:hidden">
				<section className="reveal app-section flex flex-col items-center text-center">
					<span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-100)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-800)]">
						<Sparkles size={11} />
						Live offers
					</span>
					<h1 className="mt-3 text-[26px] font-semibold leading-[1.05] tracking-tight text-[var(--color-ink-900)]">Today&apos;s deals</h1>
					<p className="mt-2.5 max-w-prose text-[13.5px] leading-snug text-[var(--color-ink-600)]">{subtitle}</p>
				</section>
			</div>

			<div className="mx-auto hidden w-full max-w-[1440px] px-4 pt-6 sm:px-6 md:block md:pt-10 lg:px-8">
				<header className="reveal space-y-3">
					<p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
						<Sparkles size={12} />
						Live offers
					</p>
					<h1 className="text-5xl font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)]">Today&apos;s deals</h1>
					<p className="max-w-prose text-base text-[var(--color-ink-600)]">{subtitle}</p>
				</header>
			</div>
		</>
	);
}

async function DealsBody() {
	const content = await loadDealsContentSafe();
	const hasContent = content.spotlight !== null || content.sections.length > 0;

	return (
		<>
			{content.spotlight ? (
				<>
					<div className="md:hidden">
						<DealSpotlight product={content.spotlight} offerBadgeLabel={content.spotlightOfferBadgeLabel} />
					</div>
					<div className="mx-auto hidden max-w-[1440px] px-4 sm:px-6 lg:px-8 md:block">
						<DealSpotlight product={content.spotlight} offerBadgeLabel={content.spotlightOfferBadgeLabel} />
					</div>
				</>
			) : null}

			<div className="md:hidden">
				<DealsOfferSections sections={content.sections} layout="mobile" />
			</div>
			<div className="mx-auto hidden max-w-[1440px] px-4 pb-24 sm:px-6 md:block md:pb-16 lg:px-8">
				<DealsOfferSections sections={content.sections} layout="desktop" />
			</div>

			{!hasContent ? (
				<div className="app-page pb-8 md:pb-16">
					<div className="reveal mx-auto max-w-lg rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 p-10 text-center text-[13px] text-[var(--color-ink-500)] md:mt-12">
						No active deals right now — fresh ones every Friday.
					</div>
				</div>
			) : null}
		</>
	);
}

export default async function DealsPage() {
	const settings = await getStoreSettingsCached();
	const bankHint = settings.bankTransferDiscountPercent > 0 ? `${settings.bankTransferDiscountPercent}% off on full bank transfer at checkout` : "Weekly drops on graded devices";
	const subtitle = `Offer-led picks plus ${bankHint.toLowerCase()}.`;

	return (
		<>
			<DealsHero subtitle={subtitle} />
			<Suspense fallback={<DealsContentFallback />}>
				<DealsBody />
			</Suspense>
		</>
	);
}

function DealsContentFallback() {
	return (
		<>
			<div className="app-page md:hidden">
				<section className="app-section">
					<Skeleton shape="text" className="mb-3 h-3 w-32" />
					<Skeleton shape="block" className="h-[120px] w-full rounded-[var(--radius-lg)]" />
				</section>
				{Array.from({ length: SECTION_SKELETON_COUNT }).map((_, index) => (
					<section key={index} className="app-section space-y-3">
						<Skeleton shape="block" className="h-28 w-full rounded-[var(--radius-lg)]" />
						<div className="grid grid-cols-2 gap-3">
							{Array.from({ length: MOBILE_PRODUCT_SKELETON_COUNT }).map((__, productIndex) => (
								<ProductCardSkeleton key={productIndex} />
							))}
						</div>
					</section>
				))}
			</div>
			<div className="mx-auto hidden max-w-[1440px] px-4 pb-24 sm:px-6 md:block md:pb-16 lg:px-8">
				<Skeleton shape="block" className="mt-10 h-[220px] w-full max-w-3xl rounded-[var(--radius-xl)]" />
				<div className="mt-16 space-y-16">
					{Array.from({ length: SECTION_SKELETON_COUNT }).map((_, index) => (
						<section key={index} className="space-y-5">
							<Skeleton shape="block" className="h-72 max-w-xl rounded-[var(--radius-xl)]" />
							<div className="grid grid-cols-4 gap-5">
								{Array.from({ length: DESKTOP_PRODUCT_SKELETON_COUNT }).map((__, productIndex) => (
									<ProductCardSkeleton key={productIndex} />
								))}
							</div>
						</section>
					))}
				</div>
			</div>
		</>
	);
}
