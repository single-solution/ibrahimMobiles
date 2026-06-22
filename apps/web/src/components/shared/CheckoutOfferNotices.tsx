"use client";

import { useMemo } from "react";

import { DEAL_NOTICES_LAYOUT_CLASS, DEAL_NOTICE_CHIP_CLASS, DealNoticeChipContent } from "@/app/_components/shop/dealOfferButtonStyles";
import { formatOfferDiscountLabel, isCheckoutNoticeOffer, type ActiveOffer } from "@store/shared";

interface CheckoutOfferNoticesProps {
	offers: ActiveOffer[];
}

export function CheckoutOfferNotices({ offers }: CheckoutOfferNoticesProps) {
	const noticeOffers = useMemo(() => offers.filter(isCheckoutNoticeOffer), [offers]);

	if (noticeOffers.length === 0) {
		return null;
	}

	return (
		<div className={DEAL_NOTICES_LAYOUT_CLASS} role="list" aria-label="Checkout offers">
			{noticeOffers.map((offer) => (
				<div key={offer.id} role="listitem" className={DEAL_NOTICE_CHIP_CLASS}>
					<DealNoticeChipContent
						badgeLabel={offer.badgeLabel?.trim() || "Offer"}
						discountLabel={formatOfferDiscountLabel(offer.action)}
						title={offer.title}
					/>
				</div>
			))}
		</div>
	);
}
