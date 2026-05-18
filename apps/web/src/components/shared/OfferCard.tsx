import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Pill } from "@/components/ui/Pill";
import { classNames, formatRelativeDate, type Offer } from "@store/shared";

interface OfferCardProps {
  offer: Offer;
  size?: "sm" | "md" | "lg";
}

const ACCENT_STYLES: Record<Offer["accentColor"], string> = {
  emerald: "from-teal-600 to-teal-800",
  amber: "from-orange-400 to-orange-600",
  rose: "from-rose-500 to-rose-700",
  sky: "from-slate-700 to-slate-900",
};

export function OfferCard({ offer, size = "md" }: OfferCardProps) {
  return (
    <Link
      href={`/deals#${offer.slug}`}
      className={classNames(
        "group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] p-3.5 text-white transition-transform hover:-translate-y-0.5 md:p-6",
        "bg-gradient-to-br",
        ACCENT_STYLES[offer.accentColor],
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
        <p className="max-w-md text-[12px] leading-snug text-white/85 md:text-sm">{offer.description}</p>
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
