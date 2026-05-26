import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Pill } from "@/components/ui/Pill";
import { classNames, formatRelativeDate, type Offer } from "@store/shared";

import {
  StructuredContentCompact,
  StructuredContentFull,
} from "@/components/shared/StructuredContent";

interface OfferCardProps {
  offer: Offer;
  size?: "sm" | "md" | "lg";
}

export function OfferCard({ offer, size = "md" }: OfferCardProps) {
  // The offer hex is mixed with the brand ink so every offer card shares
  // a unified tonal range — multiple cards in a row read as a curated
  // set instead of a saturated rainbow. The admin-set hue is still
  // recognisable (the high stop keeps ~80% of the source colour) but
  // the low stop blends 50% into `--color-ink-900` for depth and visual
  // calm. Phase 7 (Offer designer) will replace this with an
  // admin-controlled gradient definition.
  const sourceColor = offer.color?.trim() || "#e1ff51";
  const background = `linear-gradient(135deg, color-mix(in srgb, ${sourceColor} 80%, var(--color-ink-900)) 0%, color-mix(in srgb, ${sourceColor} 50%, var(--color-ink-900)) 100%)`;
  return (
    <Link
      href={`/deals#${offer.slug}`}
      style={{ background }}
      className={classNames(
        "group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] p-3.5 text-[var(--color-on-dark)] transition-transform hover:-translate-y-0.5 md:p-6",
        size === "sm" && "min-h-28 md:min-h-40",
        size === "md" && "min-h-32 md:min-h-52",
        size === "lg" && "min-h-36 sm:min-h-44 md:min-h-72 md:p-8",
      )}
    >
      <div className="relative flex items-center justify-between">
        <Pill
          tone="dark"
          size="sm"
          className="!bg-[color-mix(in_srgb,var(--color-ink-900)_30%,transparent)] !text-[var(--color-on-dark)] backdrop-blur"
        >
          {offer.badgeLabel}
        </Pill>
        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-on-dark-strong)] md:text-xs">
          <Clock size={11} />
          {formatRelativeDate(offer.expiresAt)}
        </span>
      </div>

      <div className="relative space-y-1 md:space-y-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-on-dark-strong)] md:text-xs">{offer.discountLabel}</p>
        <h3
          className={classNames(
            "font-semibold leading-tight tracking-tight",
            size === "lg" ? "text-base sm:text-lg md:text-3xl" : "text-sm sm:text-base md:text-xl",
          )}
        >
          {offer.title}
        </h3>
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
        <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium md:mt-2 md:text-sm">
          See deal
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5 md:size-[14px]" />
        </span>
      </div>

      <div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-[var(--color-on-dark-10)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 size-44 rounded-full bg-[color-mix(in_srgb,var(--color-ink-900)_10%,transparent)] blur-2xl" />
    </Link>
  );
}

