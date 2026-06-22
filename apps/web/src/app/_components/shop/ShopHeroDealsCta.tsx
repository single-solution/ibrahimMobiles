"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

import { classNames, type Offer } from "@store/shared";

function HeroDealBadge({ label }: { label: string }) {
	return (
		<span className="inline-flex items-center gap-1 rounded-sm bg-[var(--color-accent-100)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-accent-800)]">
			{label}
		</span>
	);
}

interface ShopHeroDealsCtaProps {
	offers: Offer[];
}

const DEAL_BUTTON_CLASS =
	"tap inline-flex w-fit max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border px-3 py-2 text-[var(--color-ink-900)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const PRIMARY_DEAL_BUTTON_CLASS = classNames(
	DEAL_BUTTON_CLASS,
	"border-[var(--color-accent-400)] bg-[var(--color-accent-500)] shadow-[0_8px_24px_-14px_color-mix(in_srgb,var(--color-accent-500)_65%,transparent)] hover:bg-[var(--color-accent-400)] focus-visible:ring-[var(--color-accent-400)]",
);

const SECONDARY_DEAL_BUTTON_CLASS = classNames(
	DEAL_BUTTON_CLASS,
	"border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[13px] font-semibold text-[var(--color-ink-800)] hover:border-[var(--color-ink-300)] hover:text-[var(--color-ink-900)] focus-visible:ring-[var(--color-ink-200)]",
);

function DealCtaLink({ offer }: { offer: Offer }) {
	return (
		<Link href={`/deals#${offer.slug}`} className={PRIMARY_DEAL_BUTTON_CLASS}>
			<HeroDealBadge label={offer.badgeLabel} />
			<span className="text-sm font-extrabold text-[var(--color-accent-700)]">{offer.discountLabel}</span>
			<span className="text-[13px] font-medium leading-snug text-[var(--color-ink-800)]">{offer.title}</span>
			<span className="inline-flex items-center gap-1 text-xs font-semibold">
				View
				<ArrowUpRight size={15} strokeWidth={2.4} aria-hidden />
			</span>
		</Link>
	);
}

function MoreDealsLink({ count }: { count: number }) {
	const label = count === 1 ? "+ 1 more deal" : `+ ${count} more deals`;

	return (
		<Link href="/deals" className={SECONDARY_DEAL_BUTTON_CLASS}>
			{label}
			<ArrowUpRight size={15} strokeWidth={2.4} aria-hidden />
		</Link>
	);
}

function SingleDealLink({ offer }: { offer: Offer }) {
	return (
		<Link href={`/deals#${offer.slug}`} className={PRIMARY_DEAL_BUTTON_CLASS}>
			<span className="text-[14px] font-bold">Today&apos;s deals</span>
			<HeroDealBadge label={offer.badgeLabel} />
			<span className="text-sm font-extrabold text-[var(--color-accent-700)]">{offer.discountLabel}</span>
			<span className="text-[13px] font-medium leading-snug text-[var(--color-ink-800)]">{offer.title}</span>
			<span className="inline-flex items-center gap-1 text-xs font-semibold">
				View deals
				<ArrowUpRight size={15} strokeWidth={2.4} aria-hidden />
			</span>
		</Link>
	);
}

/** Animated deals row under the catalog hero headline when live offers exist. */
export function ShopHeroDealsCta({ offers }: ShopHeroDealsCtaProps) {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => setIsVisible(true));
		return () => window.cancelAnimationFrame(frame);
	}, []);

	if (offers.length === 0) {
		return null;
	}

	const isMultiple = offers.length > 1;
	const latestOffer = offers[0];

	return (
		<div
			className={classNames(
				"grid w-full transition-[grid-template-rows,opacity,margin-top] duration-[460ms] ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none",
				isVisible ? "mt-[18px] grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
			)}
		>
			<div className="overflow-hidden">
				<div className="flex flex-wrap items-center justify-center gap-2.5">
					{isMultiple && latestOffer ? (
						<>
							<DealCtaLink offer={latestOffer} />
							<MoreDealsLink count={offers.length - 1} />
						</>
					) : latestOffer ? (
						<SingleDealLink offer={latestOffer} />
					) : null}
				</div>
			</div>
		</div>
	);
}
