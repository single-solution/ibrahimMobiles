"use client";

import { useMemo } from "react";

type BandVariant = "mobile" | "desktop";

interface SlotLayout {
  size: "sm" | "md" | "lg";
  top: number;
  left: number;
}

const DESKTOP_SLOTS: SlotLayout[] = [
  { size: "lg", top: 28, left: 12 },
  { size: "md", top: 68, left: 26 },
  { size: "sm", top: 22, left: 42 },
  { size: "md", top: 60, left: 56 },
  { size: "lg", top: 30, left: 72 },
  { size: "sm", top: 66, left: 88 },
];

/**
 * Mobile slot positions are tighter than desktop because the band is
 * only ~328px wide on a 360px viewport. Each label is centred on its
 * (top, left) anchor via `translate(-50%, -50%)` in the pop keyframe,
 * so its half-width extends past the anchor on each side. Approx
 * half-widths at the configured sizes (longest realistic product
 * name): sm ≈ 21%, md ≈ 27%, lg ≈ 35% of band width. Centres are
 * kept inside those safe zones so the band's `overflow-hidden` never
 * crops a label:
 *   sm  → 25 %–75 %
 *   md  → 30 %–70 %
 *   lg  → 35 %–65 %
 * Smaller sizes are placed at the outer rim, lg in the middle.
 */
const MOBILE_SLOTS: SlotLayout[] = [
  { size: "sm", top: 22, left: 26 },
  { size: "lg", top: 58, left: 50 },
  { size: "md", top: 30, left: 68 },
  { size: "sm", top: 78, left: 30 },
];

const DESKTOP_SIZE_CLASS: Record<SlotLayout["size"], string> = {
  lg: "text-[26px]",
  md: "text-[19px]",
  sm: "text-sm",
};

const MOBILE_SIZE_CLASS: Record<SlotLayout["size"], string> = {
  lg: "text-xl",
  md: "text-[15px]",
  sm: "text-xs",
};

const POP_CYCLE_S = 8;

interface HeroTrendingProductBandProps {
  productNames: string[];
  variant: BandVariant;
}

export function HeroTrendingProductBand({
  productNames,
  variant,
}: HeroTrendingProductBandProps) {
  const slots = variant === "desktop" ? DESKTOP_SLOTS : MOBILE_SLOTS;
  const sizeClass = variant === "desktop" ? DESKTOP_SIZE_CLASS : MOBILE_SIZE_CLASS;
  const heightClass = variant === "desktop" ? "h-[180px]" : "h-[150px]";

  const labels = useMemo(() => {
    if (productNames.length === 0) return [];
    return slots.map((slot, index) => ({
      ...slot,
      name: productNames[index % productNames.length] ?? "",
    }));
  }, [productNames, slots]);

  if (labels.length === 0) return null;

  return (
    <div
      className={`relative w-full overflow-hidden ${heightClass}`}
      aria-hidden
    >
      {labels.map((item, index) => {
        const delay = (POP_CYCLE_S / labels.length) * index;
        return (
          <span
            key={`${item.name}-${index}`}
            className={`hero-trending-pop pointer-events-none absolute whitespace-nowrap font-bold tracking-tight text-[var(--color-ink-900)] ${sizeClass[item.size]}`}
            style={{
              top: `${item.top}%`,
              left: `${item.left}%`,
              animationDelay: `${delay}s`,
            }}
          >
            {item.name}
          </span>
        );
      })}
    </div>
  );
}
