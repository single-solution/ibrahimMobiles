import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Pill } from "@/components/ui/Pill";
import { classNames, formatRelativeDate, type Offer } from "@store/shared";

import { StructuredContentCompact, StructuredContentFull } from "@/components/shared/StructuredContent";

interface OfferCardProps {
	offer: Offer;
	size?: "sm" | "md" | "lg";
	/** Deals grid — full copy, height follows content. */
	variant?: "compact" | "full";
}

export function OfferCard({ offer, size = "md", variant = "compact" }: OfferCardProps) {
	const isFull = variant === "full";
	// Admin hue mixed into brand ink so stacked offer cards share one tonal range.
	const sourceColor = offer.color?.trim() || "#e1ff51";
	const background = `linear-gradient(135deg, color-mix(in srgb, ${sourceColor} 80%, var(--color-ink-900)) 0%, color-mix(in srgb, ${sourceColor} 50%, var(--color-ink-900)) 100%)`;
	const surfaceClassName = classNames(
		"group relative flex h-full min-h-0 w-full flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] p-3.5 text-[var(--color-on-dark)] md:p-6",
		!isFull && "transition-transform hover:-translate-y-0.5",
		!isFull && size === "sm" && "min-h-28 md:min-h-40",
		!isFull && size === "md" && "min-h-32 md:min-h-52",
		!isFull && size === "lg" && "min-h-36 sm:min-h-44 md:min-h-72 md:p-8",
		isFull && size === "lg" && "md:p-8",
	);

	const body = (
		<>
			<div className="relative flex items-center justify-between">
				<Pill tone="dark" size="sm" className="!bg-[color-mix(in_srgb,var(--color-ink-900)_45%,transparent)] !text-[var(--color-on-dark)]">
					{offer.badgeLabel}
				</Pill>
				{offer.expiresAt ? (
					<span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-on-dark-strong)] md:text-xs">
						<Clock size={11} />
						{formatRelativeDate(offer.expiresAt)}
					</span>
				) : null}
			</div>

			<div className={classNames("relative", isFull ? "mt-3 flex min-h-0 flex-1 flex-col md:mt-4" : "space-y-1 md:space-y-2")}>
				<div className={isFull ? "min-h-0 flex-1 space-y-1 md:space-y-2" : undefined}>
					<p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-on-dark-strong)] md:text-xs">{offer.discountLabel}</p>
					<h3 className={classNames("font-semibold leading-tight tracking-tight", size === "lg" ? "text-base sm:text-lg md:text-3xl" : "text-sm sm:text-base md:text-xl")}>
						{offer.title}
					</h3>
					{isFull ? (
						<StructuredContentFull
							content={offer.content}
							fallback={offer.description}
							className="max-w-none text-[12px] leading-snug text-[var(--color-on-dark-strong)] md:text-sm"
							iconColor="var(--color-on-dark-strong)"
							bulletItemClassName="text-[12px] text-[var(--color-on-dark-strong)] md:text-[12.5px]"
						/>
					) : (
						<>
							<StructuredContentCompact
								content={offer.content}
								fallback={offer.description}
								clampLines={size === "lg" ? 3 : 2}
								className="max-w-md text-[12px] leading-snug text-[var(--color-on-dark-strong)] md:text-sm"
							/>
							{size === "lg" && offer.content?.bullets?.length ? (
								<StructuredContentFull
									content={{ summary: "", bullets: offer.content.bullets }}
									maxBullets={3}
									className="max-w-md pt-1"
									iconColor="var(--color-on-dark-strong)"
									bulletItemClassName="text-[12px] text-[var(--color-on-dark-strong)] md:text-[12.5px]"
								/>
							) : null}
						</>
					)}
				</div>
				{!isFull ? (
					<span className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium md:mt-2 md:text-sm">
						See deal
						<ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5 md:size-[14px]" />
					</span>
				) : null}
			</div>

			<div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-[var(--color-on-dark-10)] blur-2xl" />
			<div className="pointer-events-none absolute -bottom-20 -left-12 size-44 rounded-full bg-[color-mix(in_srgb,var(--color-ink-900)_10%,transparent)] blur-2xl" />
		</>
	);

	if (isFull) {
		return (
			<div id={offer.slug} style={{ background }} className={surfaceClassName}>
				{body}
			</div>
		);
	}

	return (
		<Link href={`/deals#${offer.slug}`} style={{ background }} className={surfaceClassName}>
			{body}
		</Link>
	);
}
