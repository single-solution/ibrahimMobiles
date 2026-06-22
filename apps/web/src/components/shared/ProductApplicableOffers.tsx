"use client";

import { Check } from "lucide-react";

import { classNames, formatOfferDiscountLabel, type ActiveOffer } from "@store/shared";

interface ProductApplicableOffersProps {
	offers: ActiveOffer[];
	selectedOfferId: string | null;
	onSelectOffer: (offerId: string) => void;
}

const OFFER_BUTTON_CLASS =
	"tap inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border px-3 py-2 text-[13px] font-semibold leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-400)] focus-visible:ring-offset-2";

export function ProductApplicableOffers({ offers, selectedOfferId, onSelectOffer }: ProductApplicableOffersProps) {
	if (offers.length === 0) {
		return null;
	}

	return (
		<ul className="flex flex-wrap gap-2" aria-label="Apply an offer">
			{offers.map((offer) => {
				const isApplied = offer.id === selectedOfferId;
				const discountLabel = formatOfferDiscountLabel(offer.action);

				return (
					<li key={offer.id}>
						<button
							type="button"
							aria-pressed={isApplied}
							onClick={() => onSelectOffer(offer.id)}
							className={classNames(
								OFFER_BUTTON_CLASS,
								isApplied
									? "border-[var(--color-accent-600)] bg-[var(--color-accent-500)] text-[var(--color-ink-900)] shadow-[0_6px_18px_-12px_color-mix(in_srgb,var(--color-accent-500)_70%,transparent)]"
									: "border-[var(--color-accent-300)] bg-[var(--color-accent-100)] text-[var(--color-ink-800)] hover:border-[var(--color-accent-400)] hover:bg-[var(--color-accent-200)]",
							)}
						>
							{isApplied ? <Check size={14} strokeWidth={2.4} aria-hidden className="shrink-0" /> : null}
							<span>{isApplied ? "Applied" : "Apply"}</span>
							{offer.badgeLabel ? (
								<span className="rounded-sm bg-[var(--color-accent-50)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-accent-800)]">
									{offer.badgeLabel}
								</span>
							) : null}
							<span className="font-medium">{discountLabel}</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
