import type { StoreSettings } from "@store/shared";

import { HeroMaskSweepHeadline } from "@/app/_components/home/HeroMaskSweepHeadline";
import { buildTrustHints } from "@/app/_components/home/trustHints";
import { SHOP_CATEGORY_PAGE_CLASS } from "@/lib/catalog/shopListingGrid";

interface HomeCompactBannerProps {
	settings: StoreSettings;
}

/** Horizontal brand band — the mask-sweep lockup sits left, the admin-managed
 *  promise chips align right (stacking below the headline on small screens). */
export function HomeCompactBanner({ settings }: HomeCompactBannerProps) {
	const hints = buildTrustHints(settings);

	return (
		<section className="relative overflow-hidden pb-6 pt-3 md:pb-10 md:pt-6">
			<div className={SHOP_CATEGORY_PAGE_CLASS}>
				<div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-ink-100)] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-canvas-deep))] px-4 py-4 sm:px-6 md:px-8 md:py-6">
					<div className="pointer-events-none absolute inset-0">
						<div className="absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-canvas)_72%,transparent),transparent)]" />
						<div className="absolute inset-y-0 left-[-12%] w-[36%] -rotate-12 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--color-canvas)_30%,transparent),transparent)] opacity-70" />
					</div>
					<div className="relative flex flex-col items-start gap-6 overflow-hidden lg:flex-row lg:items-center lg:justify-between lg:gap-12">
						<div className="w-full min-w-0 overflow-hidden lg:flex-1">
							<div className="w-full overflow-hidden md:hidden">
								<HeroMaskSweepHeadline variant="mobile" align="left" />
							</div>
							<div className="hidden w-full overflow-hidden md:block md:origin-left md:scale-90">
								<HeroMaskSweepHeadline variant="desktop" align="left" />
							</div>
							{settings.siteTagline ? (
								<p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--color-ink-600)]">
									{settings.siteTagline}
								</p>
							) : null}
						</div>

						{hints.length > 0 ? (
							<ul className="flex w-full flex-wrap gap-x-5 gap-y-2.5 lg:w-auto lg:shrink-0 lg:flex-col lg:gap-4">
								{hints.map(({ icon: Icon, label }) => (
									<li key={label} className="flex items-center gap-2.5">
										<span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
											<Icon size={17} strokeWidth={2.2} />
										</span>
										<span className="whitespace-nowrap text-[13px] font-medium text-[var(--color-ink-700)]">
											{label}
										</span>
									</li>
								))}
							</ul>
						) : null}
					</div>
				</div>
			</div>
		</section>
	);
}
