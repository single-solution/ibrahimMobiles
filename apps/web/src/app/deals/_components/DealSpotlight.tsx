import Link from "next/link";

import { formatPrice, type Product } from "@store/shared";

import { GradeBadge } from "@/components/shared/GradeBadge";
import { ProductCardOfferBadge } from "@/components/shared/ProductCardOfferBadge";
import { ProductImage } from "@/components/shared/ProductImage";
import { productHref } from "@/lib/catalog/productPaths";
import { resolveSpotlightVariant } from "@/lib/pricing/productOfferMatch";

interface DealSpotlightProps {
	product: Product;
	offerBadgeLabel?: string | null;
}

export function DealSpotlight({ product, offerBadgeLabel }: DealSpotlightProps) {
	const variant = resolveSpotlightVariant(product);
	const brandName = product.brandName ?? product.brandSlug;
	const href = productHref(product);
	const heroImage = product.images?.[0];

	if (!variant || !heroImage) {
		return null;
	}

	return (
		<section className="reveal app-section cv-auto md:mt-10">
			<p className="app-section-eyebrow md:text-xs md:font-semibold md:uppercase md:tracking-[0.18em] md:text-[var(--color-accent-700)]">
				Deal of the week
			</p>
			<Link
				href={href}
				className="tap group mt-3 flex overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--color-ink-200)] md:mt-4 md:rounded-[var(--radius-xl)]"
			>
				<div className="relative aspect-square w-[120px] shrink-0 bg-[var(--color-canvas-deep)] sm:w-[140px] md:w-[220px]">
					<ProductImage
						image={heroImage}
						variant="card"
						name={product.name}
						brandName={brandName}
						brandSlug={product.brandSlug}
						priority
					/>
					<div className="absolute right-1.5 top-1.5 z-10 flex flex-col items-end gap-1 md:right-3 md:top-3 md:gap-1.5">
						{offerBadgeLabel ? <ProductCardOfferBadge label={offerBadgeLabel} /> : null}
						<GradeBadge
							categorySlug={product.categorySlug}
							gradeSlug={variant.gradeSlug}
							size="sm"
						/>
					</div>
				</div>
				<div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-3 md:gap-2 md:px-6 md:py-5">
					<p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-500)] md:text-[11px]">
						{brandName}
					</p>
					<h2 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-[var(--color-ink-900)] md:text-2xl md:leading-tight">
						{product.name}
					</h2>
					<p className="text-[14px] font-semibold tracking-tight text-[var(--color-ink-900)] md:text-xl">
						{formatPrice(variant.priceRupees)}
					</p>
					<span className="mt-1 text-[12px] font-medium text-[var(--color-accent-700)] md:mt-2 md:text-[13px]">
						View deal →
					</span>
				</div>
			</Link>
		</section>
	);
}
