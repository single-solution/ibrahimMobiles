"use client";

import { useState, useEffect } from "react";
import { classNames } from "@store/shared";

type BandVariant = "mobile" | "desktop";

interface SlotLayout {
  size: "sm" | "md" | "lg";
  top: number;
  left: number;
  name: string;
}

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

function generateDistributedSlots(count: number, products: string[]): SlotLayout[] {
  if (products.length === 0) return [];
  const sizes: ("sm" | "md" | "lg")[] = ["sm", "md", "lg", "md", "sm", "lg"];
  const slots: SlotLayout[] = [];
  
  // Shuffle products to ensure random selection and prevent repetition
  const shuffledProducts = [...products].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < count; i++) {
    // Divide horizontal space into `count` segments to ensure they spread out nicely
    const segmentWidth = 90 / count;
    const baseLeft = 5 + (i * segmentWidth);
    // Give it a random left within the segment to avoid spilling over
    const left = baseLeft + Math.random() * (segmentWidth * 0.6); 
    
    // Top: random between 20 and 80 to stay within vertical bounds
    const top = 20 + Math.random() * 60;
    
    slots.push({
      size: sizes[Math.floor(Math.random() * sizes.length)],
      top,
      left,
      name: shuffledProducts[i % shuffledProducts.length] ?? "",
    });
  }
  
  // Shuffle the final slots so the popping animation sequence isn't purely left-to-right
  return slots.sort(() => Math.random() - 0.5);
}

interface HeroTrendingProductBandProps {
  productNames: string[];
  variant: BandVariant;
}

export function HeroTrendingProductBand({
  productNames,
  variant,
}: HeroTrendingProductBandProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [labels, setLabels] = useState<SlotLayout[]>([]);
  
  const popCycle = variant === "desktop" ? 8 : 6;
  const count = variant === "desktop" ? 6 : 4;
  
  // Delay mounting to let the main page load smoothly without hanging
  useEffect(() => {
    const timer = setTimeout(() => {
      setLabels(generateDistributedSlots(count, productNames));
      setIsMounted(true);
    }, 600); // 600ms delay to let initial paint and LCP settle
    return () => clearTimeout(timer);
  }, [productNames, count, variant]);

  const sizeClass = variant === "desktop" ? DESKTOP_SIZE_CLASS : MOBILE_SIZE_CLASS;
  const heightClass = variant === "desktop" ? "h-[140px]" : "h-[100px]";

  if (productNames.length === 0) return null;

  return (
    <div
      className={classNames(
        "relative w-full overflow-hidden transition-all duration-[800ms] ease-out-quart",
        isMounted ? heightClass : "h-0 opacity-0"
      )}
      aria-hidden
    >
      {isMounted && labels.map((item, index) => {
        const delay = (popCycle / labels.length) * index;
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
              animationDuration: `${popCycle}s`,
              animationDelay: `${delay}s`,
              animationIterationCount: "infinite",
              animationName: "hero-product-pop", // Defined in globals.css
            }}
          >
            {item.name}
          </span>
        );
      })}
    </div>
  );
}
