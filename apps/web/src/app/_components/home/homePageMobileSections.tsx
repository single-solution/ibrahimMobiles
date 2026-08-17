import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronDown, MapPin, Sparkles } from "lucide-react";
import { GradesByCategoryTabs } from "@/app/_components/home/GradesByCategoryTabs";
import { HeroHeadlineWithTrendingProducts } from "@/app/_components/home/HeroTrendingProductBand";
import { ShopTypeCard, type HeroProps, type ProcessSectionProps, type ShopTypesSectionProps, type VisitStoreSectionProps } from "@/app/_components/home/homePageDesktopSections";
import { HeroVideoButtons } from "@/app/_components/home/HeroVideoButtons";
import { StoreMapEmbed } from "@/components/shared/StoreMapEmbed";
import { KineticHeading } from "@/components/shared/motion/KineticHeading";
import { MagneticHover } from "@/components/shared/motion/MagneticHover";
import { classNames, getPaymentMethods } from "@store/shared";
import { ButtonLink } from "@store/ui";
import { getCategoriesCached, getGradesCached } from "@/lib/core/cached";
import { buildGradeCategoryGroups } from "@/lib/core/gradeGroups";
import { HOME_FEATURED_CATEGORY_COUNT, formatCategorySectionTitle, getHomeCategoryGridClass, shouldShowBrowseAllCategories } from "@/lib/core/categoryDisplay";
import { SHOP_CATEGORY_PAGE_CLASS } from "@/lib/catalog/shopListingGrid";
import { ShopHeroDealsCta } from "@/app/_components/shop/ShopHeroDealsCta";
import type { HomePageCategory } from "@/lib/core/pageData";

export const MOBILE_CATEGORY_STAGGER_MS = 80;

export function CategorySectionHeadline({ labels }: { labels: string[] }) {
	if (labels.length === 0) {
		return <>Every category.</>;
	}
	/* Each category label sits on its own line. Single-word labels
     (e.g. "Samsung", "Audio") must never break across lines — if the
     container ever gets narrow, the eye expects the label to overflow,
     not to split mid-word. */
	if (labels.length <= 3) {
		return (
			<>
				{labels.map((label) => (
					<span key={label} className="block whitespace-nowrap">
						{label}.
					</span>
				))}
			</>
		);
	}
	return (
		<>
			<span className="block whitespace-nowrap">{labels[0]}.</span>
			<span className="block whitespace-nowrap">{labels[1]}.</span>
			<span className="block whitespace-nowrap text-[var(--color-accent-700)]">& more.</span>
		</>
	);
}

export function MobileShopTypesSection({ categories }: ShopTypesSectionProps) {
	const featured = categories.slice(0, HOME_FEATURED_CATEGORY_COUNT);
	const showBrowseAll = shouldShowBrowseAllCategories(categories.length);
	const headlineLabels = categories.map((category) => category.label);
	const homeCategorySlug = categories.find((category) => category.isActive)?.slug ?? "";

	return (
		<section className="app-section cv-auto">
			<div className="reveal mb-3">
				<p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">Browse by category</p>
				<h2 className="font-headline mt-1 text-[28px] font-semibold leading-[0.95] tracking-[-0.01em] text-[var(--color-ink-900)] uppercase">
					<CategorySectionHeadline labels={headlineLabels} />
				</h2>
				<p className="mt-2 max-w-prose text-[13px] leading-snug text-[var(--color-ink-600)]">One shop. One graded standard. Tap a category to start browsing.</p>
			</div>
			<div className={`reveal-scroll-list ${getHomeCategoryGridClass(featured.length, "mobile")}`}>
				{featured.map((meta) => (
					<ShopTypeCard key={meta.slug} meta={meta} variant="mobile" homeCategorySlug={homeCategorySlug} scrollReveal />
				))}
			</div>
			{showBrowseAll ? (
				<Link
					href="/"
					className="cta-arrow tap mt-4 inline-flex w-full items-center justify-center gap-1 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--color-accent-700)] active:bg-[var(--color-canvas-deep)]"
				>
					Browse all categories
					<ArrowRight size={13} />
				</Link>
			) : null}
		</section>
	);
}

const MOBILE_HERO_GRADIENT = "linear-gradient(180deg, color-mix(in srgb, var(--color-accent-50) 55%, var(--color-canvas)) 0%, var(--color-canvas) 55%, var(--color-canvas) 100%)";

export function MobileHero({ heroProducts, settings, shopHref, showVisitStoreButton = true, showWeAreDifferentCue = true, showHowWeWorkButton = false, layout = "viewport", heroDeals = [] }: HeroProps) {
	const productNames = heroProducts.map((product) => product.name);
	const isContentLayout = layout === "content";
	const bgVideoUrl = settings?.heroBackgroundVideoUrl?.trim() || "/videos/hero-banner-bg.mp4";

	return (
		<section
			className={classNames(
				"relative flex flex-col items-center overflow-hidden text-center",
				!isContentLayout && "reveal-stagger",
				!isContentLayout && "-mx-4 border-b border-[var(--color-ink-100)] px-4",
				"-mt-[var(--mobile-header-h)]",
				isContentLayout ? "pb-8 pt-[calc(var(--mobile-header-h)+1.75rem)] md:pb-10 md:pt-[calc(var(--mobile-header-h)+2.25rem)]" : "justify-evenly pt-[var(--mobile-header-h)]",
			)}
			style={{
				background: MOBILE_HERO_GRADIENT,
				...(isContentLayout ? {} : { minHeight: "calc(100dvh - var(--mobile-tabbar-h))" }),
			}}
		>
			{bgVideoUrl ? (
				<div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none" aria-hidden="true">
					<video
						src={bgVideoUrl}
						autoPlay
						muted
						loop
						playsInline
						preload="auto"
						tabIndex={-1}
						className="h-full w-full object-cover opacity-85 dark:opacity-75 transform-gpu motion-reduce:hidden"
					>
						<source src={bgVideoUrl} type="video/mp4" />
					</video>
					<div className="absolute inset-0 bg-gradient-to-b from-[var(--color-canvas)]/60 via-[var(--color-canvas)]/20 to-[var(--color-canvas)]" />
				</div>
			) : null}

			<div
				className={classNames(
					"relative z-10 flex w-full flex-col items-center text-center",
					!isContentLayout && "reveal-stagger",
					isContentLayout ? SHOP_CATEGORY_PAGE_CLASS : "w-full",
				)}
			>
				<div className={classNames("w-full min-w-0 overflow-hidden px-0.5 py-1.5", !isContentLayout && "reveal")}>
					<HeroHeadlineWithTrendingProducts productNames={productNames} variant="mobile" density={isContentLayout ? "compact" : "default"} />
				</div>

				{isContentLayout && heroDeals.length > 0 ? (
					<div className="w-full px-0.5">
						<ShopHeroDealsCta offers={heroDeals} />
					</div>
				) : null}
			</div>

			<div className="relative z-10 flex w-full flex-col items-center">
				{showVisitStoreButton ? (
					<div className={classNames("flex flex-col items-center gap-6", !isContentLayout && "reveal")}>
						<ButtonLink
							href={shopHref}
							variant="primary"
							size="lg"
							className="cta-arrow !rounded-full shadow-[0_12px_36px_-16px_color-mix(in_srgb,var(--color-accent-500)_75%,transparent)]"
							trailingIcon={<ArrowUpRight size={17} strokeWidth={2.4} />}
						>
							Visit store
						</ButtonLink>
					</div>
				) : null}

				{showHowWeWorkButton ? (
					<div className={classNames("w-full px-0.5", !isContentLayout && "reveal")}>
						<HeroVideoButtons
							whoWeAreUrl={settings?.heroVideoWhoWeAreUrl}
							howWeDeliverUrl={settings?.heroVideoHowWeDeliverUrl}
						/>
					</div>
				) : null}
			</div>

			{showWeAreDifferentCue ? (
				<a
					href="#how-to-buy"
					aria-label="Scroll to next section"
					className={classNames(
						"hero-scroll-cue tap group relative z-10 inline-flex flex-col items-center gap-1 text-[var(--color-ink-500)] active:text-[var(--color-ink-900)]",
						!isContentLayout && "reveal",
					)}
				>
					<span className="text-[10px] font-semibold uppercase tracking-[0.2em]">We Are Different</span>
					<ChevronDown size={18} strokeWidth={2.2} className="animate-bounce" />
				</a>
			) : null}
		</section>
	);
}

export function MobileProcessSection({ flows }: ProcessSectionProps) {
	return (
		<section id="how-to-buy" className="app-section cv-auto">
			<div className="reveal mb-7 text-center">
				<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">How it works</p>
				<KineticHeading
					as="h2"
					lines={["Three flows", "behind every order"]}
					stagger={0.028}
					className="font-headline mt-2 text-[40px] font-semibold leading-[0.95] tracking-[-0.01em] text-[var(--color-ink-900)] uppercase"
				/>
				<p className="mx-auto mt-3 max-w-prose text-[13px] leading-snug text-[var(--color-ink-500)]">From sourcing to refund — every step on record.</p>
			</div>
			<div className="reveal-scroll-list space-y-4">
				{flows.map((flow) => {
					const Icon = flow.icon;
					return (
						<div
							key={flow.key}
							className="reveal reveal-scroll reveal-rise overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]"
						>
							<div className="flex items-center gap-2.5 bg-[var(--color-ink-900)] px-3.5 py-3 text-[var(--color-canvas)]">
								<span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
									<Icon size={14} strokeWidth={2.2} />
								</span>
								<div className="min-w-0 flex-1">
									<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-400)]">{flow.label}</p>
									<p className="text-[13px] font-semibold leading-tight">{flow.caption}</p>
								</div>
							</div>
							<ol className="divide-y divide-[var(--color-ink-100)]">
								{flow.steps.map((step, index) => (
									<li key={step.title} className="flex items-start gap-2.5 px-3.5 py-3">
										<span className="grid size-6 shrink-0 place-items-center rounded-full border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] text-[11px] font-semibold text-[var(--color-accent-800)]">
											{index + 1}
										</span>
										<div className="min-w-0 flex-1">
											<p className="text-[13px] font-semibold leading-tight text-[var(--color-ink-900)]">{step.title}</p>
											<p className="mt-0.5 max-w-prose text-[12px] leading-snug text-[var(--color-ink-600)]">{step.detail}</p>
										</div>
									</li>
								))}
							</ol>
						</div>
					);
				})}
			</div>
		</section>
	);
}

export async function MobileGradesSection() {
	// Hard-failing the homepage if the Grade collection is unreachable would
	// be a terrible UX — render an empty grid (the surrounding section copy
	// is still useful) instead of throwing.
	let gradeDescriptors: Awaited<ReturnType<typeof getGradesCached>> = [];
	let categories: Awaited<ReturnType<typeof getCategoriesCached>> = [];
	try {
		[gradeDescriptors, categories] = await Promise.all([getGradesCached(), getCategoriesCached()]);
	} catch {
		gradeDescriptors = [];
		categories = [];
	}

	const groups = buildGradeCategoryGroups(
		gradeDescriptors,
		categories.map((category) => ({
			slug: category.slug,
			label: category.label,
			sortOrder: category.sortOrder,
		})),
	);

	return (
		<section className="cv-auto -mx-4 mt-20 bg-[var(--color-ink-900)] px-4 py-14 text-[var(--color-canvas)]">
			<div className="reveal space-y-3 text-center">
				<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-400)]">How we grade</p>
				<KineticHeading
					as="h2"
					lines={["Honest grades.", "No surprises."]}
					stagger={0.03}
					className="font-headline text-[44px] font-semibold leading-[0.95] tracking-[-0.01em] uppercase"
					lineClassNames={["", "text-[var(--color-accent-300)]"]}
				/>
				<p className="mx-auto max-w-prose text-[13px] leading-snug text-[var(--color-ink-300)]">
					Thorough condition check — then a grade for that category. We pick it, we stand behind it.
				</p>
			</div>
			<GradesByCategoryTabs groups={groups} variant="mobile" />
			<Link
				href="#how-to-buy"
				className="cta-arrow tap mt-8 inline-flex w-full items-center justify-center gap-1 rounded-full border border-[var(--color-on-dark-15)] bg-[var(--color-on-dark-06)] px-4 py-2.5 text-[13px] font-semibold text-[var(--color-accent-300)] active:bg-[var(--color-on-dark-10)]"
			>
				Read our inspection process
				<ArrowRight size={13} />
			</Link>
		</section>
	);
}

export function MobileVisitStoreSection({ settings }: VisitStoreSectionProps) {
	return (
		<section id="contact" className="app-section cv-auto">
			<div className="reveal mb-7 text-center">
				<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">Visit · Call · Chat</p>
				<KineticHeading
					as="h2"
					lines={["Walk in", "or order online"]}
					stagger={0.03}
					className="font-headline mt-2 text-[40px] font-semibold leading-[0.95] tracking-[-0.01em] text-[var(--color-ink-900)] uppercase"
					lineClassNames={["", "text-[var(--color-accent-700)]"]}
				/>
				<p className="mx-auto mt-3 max-w-prose text-[13px] leading-snug text-[var(--color-ink-500)]">
					Visit the store to inspect stock in person — or message us, we ship anywhere in the country.
				</p>
			</div>

			<div className="reveal overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
				<StoreMapEmbed className="aspect-[16/9]" settings={settings} />
				<div className="flex items-start gap-2.5 p-3.5">
					<span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-700)]">
						<MapPin size={14} />
					</span>
					<div className="min-w-0 flex-1">
						<p className="text-[14px] font-semibold leading-tight text-[var(--color-ink-900)]">{settings.storeAddressLine1}</p>
						<p className="mt-0.5 text-[12.5px] text-[var(--color-ink-500)]">
							{settings.storeAddressLine2} · {settings.storeHours}
						</p>
					</div>
				</div>

				<div className="space-y-3 border-t border-[var(--color-ink-100)] p-3.5">
					<div>
						<p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">Payment we accept</p>
						<ul className="mt-1.5 flex flex-wrap gap-1">
							{getPaymentMethods(settings).map((paymentMethod) => (
								<li
									key={paymentMethod.id}
									className="rounded-full border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-2 py-0.5 text-[11px] text-[var(--color-ink-700)]"
								>
									{paymentMethod.label}
								</li>
							))}
						</ul>
					</div>

					<div>
						<p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">Delivery</p>
						<p className="mt-1 text-[13px] font-semibold text-[var(--color-ink-900)]">Nationwide delivery</p>
						<p className="text-[11.5px] text-[var(--color-ink-500)]">Same-day in-city · 1–3 days nationwide</p>
					</div>
				</div>
			</div>
		</section>
	);
}
