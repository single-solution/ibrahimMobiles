"use client";

import { useMemo, useState, useEffect } from "react";
import { classNames } from "@store/shared";

type BandVariant = "mobile" | "desktop";

interface SlotLayout {
  size: "sm" | "md" | "lg";
  top: number;
  left: number;
}

// Reduced slot count for better performance and less clutter
const DESKTOP_SLOTS: SlotLayout[] = [
  { size: "lg", top: 40, left: 20 },
  { size: "md", top: 60, left: 50 },
  { size: "sm", top: 30, left: 80 },
];

const MOBILE_SLOTS: SlotLayout[] = [
  { size: "md", top: 35, left: 30 },
  { size: "sm", top: 65, left: 70 },
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

const POP_CYCLE_S = 6;

interface HeroTrendingProductBandProps {
  productNames: string[];
  variant: BandVariant;
}

export function HeroTrendingProductBand({
  productNames,
  variant,
}: HeroTrendingProductBandProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  // Delay mounting to let the main page load smoothly without hanging
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 600); // 600ms delay to let initial paint and LCP settle
    return () => clearTimeout(timer);
  }, []);

  const slots = variant === "desktop" ? DESKTOP_SLOTS : MOBILE_SLOTS;
  const sizeClass = variant === "desktop" ? DESKTOP_SIZE_CLASS : MOBILE_SIZE_CLASS;
  const heightClass = variant === "desktop" ? "h-[140px]" : "h-[100px]";

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
      className={classNames(
        "relative w-full overflow-hidden transition-all duration-[800ms] ease-out-quart",
        isMounted ? heightClass : "h-0 opacity-0"
      )}
      aria-hidden
    >
      {isMounted && labels.map((item, index) => {
        const delay = (POP_CYCLE_S / labels.length) * index;
        return (
          <span
            key={`${item.name}-${index}`}
            className={classNames(
              "card-chip-cycle pointer-events-none absolute whitespace-nowrap font-bold tracking-tight text-[var(--color-ink-900)]",
              sizeClass[item.size]
            )}
            style={{
              top: `${item.top}%`,
              left: `${item.left}%`,
              animationDuration: `${POP_CYCLE_S}s`,
              animationDelay: `${delay}s`,
              animationIterationCount: "infinite",
              animationName: "hero-product-pop", // We'll redefine this to be smoother
            }}
          >
            {item.name}
          </span>
        );
      })}
    </div>
  );
}
