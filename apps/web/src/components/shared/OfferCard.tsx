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
  // Phase 1: `Offer.color` is a single hex string. We render a diagonal
  // gradient that darkens the base colour so the card still has the depth
  // it had with the legacy preset gradients. Phase 7 (Offer designer)
  // will replace this with an admin-controlled gradient definition.
  const background = `linear-gradient(135deg, ${offer.color}, ${darken(offer.color, 0.22)})`;
  return (
    <Link
      href={`/deals#${offer.slug}`}
      style={{ background }}
      className={classNames(
        "group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] p-3.5 text-white transition-transform hover:-translate-y-0.5 md:p-6",
        size === "sm" && "min-h-28 md:min-h-40",
        size === "md" && "min-h-32 md:min-h-52",
        size === "lg" && "min-h-36 sm:min-h-44 md:min-h-72 md:p-8",
      )}
    >
      <div className="relative flex items-center justify-between">
        <Pill tone="dark" size="sm" className="!bg-black/30 !text-white backdrop-blur">
          {offer.badgeLabel}
        </Pill>
        <span className="inline-flex items-center gap-1 text-[10px] text-white/85 md:text-xs">
          <Clock size={11} />
          {formatRelativeDate(offer.expiresAt)}
        </span>
      </div>

      <div className="relative space-y-1 md:space-y-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/85 md:text-xs">{offer.discountLabel}</p>
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
          className="max-w-md text-[12px] leading-snug text-white/85 md:text-sm"
        />
        {size === "lg" && offer.content?.bullets?.length ? (
          <StructuredContentFull
            content={{ summary: "", bullets: offer.content.bullets }}
            maxBullets={3}
            className="max-w-md pt-1"
            iconColor="rgba(255,255,255,0.95)"
            bulletItemClassName="text-[12px] text-white/90 md:text-[12.5px]"
          />
        ) : null}
        <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium md:mt-2 md:text-sm">
          See deal
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5 md:size-[14px]" />
        </span>
      </div>

      <div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 size-44 rounded-full bg-black/10 blur-2xl" />
    </Link>
  );
}

/** Darken a `#rrggbb` hex by `amount` (0..1). Used to fake a gradient
 *  endpoint from the single admin-authored offer colour. */
function darken(hex: string | undefined, amount: number): string {
  if (!hex || typeof hex !== "string") {
    return "#f59e0b";
  }
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) {
    return hex;
  }
  const num = Number.parseInt(match[1], 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
