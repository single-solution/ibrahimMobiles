"use client";

import { Tag } from "lucide-react";

import { formatOfferActionHint, type ActiveOffer } from "@store/shared";

interface ProductApplicableOffersProps {
	offers: ActiveOffer[];
}

export function ProductApplicableOffers({ offers }: ProductApplicableOffersProps) {
	if (offers.length === 0) {
		return null;
	}

	return (
		<section
			className="rounded-[var(--radius-lg)] border border-[var(--color-accent-200)]/80 bg-[var(--color-accent-50)]/50 px-3 py-2.5 md:px-4 md:py-3"
			aria-label="Available offers"
		>
			<div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-800)] md:text-[12px]">
				<Tag size={13} aria-hidden className="shrink-0" />
				Offers on this item
			</div>
			<ul className="mt-2 space-y-2">
				{offers.map((offer) => (
					<li
						key={offer.id}
						className="rounded-[var(--radius-md)] border border-[var(--color-accent-100)] bg-[var(--color-surface)] px-2.5 py-2 md:px-3"
					>
						{offer.badgeLabel ? (
							<p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-accent-700)]">
								{offer.badgeLabel}
							</p>
						) : null}
						<p className="text-[13px] font-semibold leading-snug text-[var(--color-ink-900)] md:text-[14px]">
							{offer.title}
						</p>
						<p className="mt-0.5 text-[11px] leading-snug text-[var(--color-ink-600)] md:text-[12px]">
							{formatOfferActionHint(offer.action)}. Final price is calculated in cart.
						</p>
					</li>
				))}
			</ul>
		</section>
	);
}
