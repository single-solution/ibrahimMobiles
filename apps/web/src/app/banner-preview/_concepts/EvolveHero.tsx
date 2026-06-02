"use client";

import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { HeroMaskSweepHeadline } from "@/app/_components/home/HeroMaskSweepHeadline";
import { ConceptShell, ProductTile, SAMPLE_PRODUCTS, ScopePill } from "./previewKit";

/** Corner-anchored floating tiles framing the kinetic headline. */
const CORNERS = [
  { product: SAMPLE_PRODUCTS[0], className: "left-0 top-4", rotate: "-7deg", delay: "0s" },
  { product: SAMPLE_PRODUCTS[3], className: "right-0 top-10", rotate: "6deg", delay: "1s" },
  { product: SAMPLE_PRODUCTS[1], className: "bottom-2 left-6", rotate: "5deg", delay: "1.6s" },
  { product: SAMPLE_PRODUCTS[4], className: "bottom-6 right-4", rotate: "-5deg", delay: "0.6s" },
];

export function EvolveHero() {
  return (
    <ConceptShell>
      <div className="relative">
        {/* Floating product tiles, hidden on small screens to protect the headline */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          {CORNERS.map((corner) => (
            <div
              key={corner.product.name}
              className={`bp-float absolute ${corner.className}`}
              style={{ animationDelay: corner.delay }}
            >
              <ProductTile
                product={corner.product}
                widthClass="w-[140px]"
                style={{ transform: `rotate(${corner.rotate})` }}
              />
            </div>
          ))}
        </div>

        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <ScopePill>
            <BadgeCheck size={13} />
            Cameras · Laptops · Audio &amp; more
          </ScopePill>

          <HeroMaskSweepHeadline variant="desktop" />

          <p className="max-w-md text-sm text-[var(--color-ink-600)]">
            A general marketplace for pre-owned tech — every unit inspected,
            graded and guaranteed before it reaches you.
          </p>

          <span className="inline-flex h-12 items-center gap-1.5 rounded-full bg-[var(--color-accent-500)] px-6 text-sm font-semibold text-[var(--color-ink-900)] shadow-[var(--shadow-md)]">
            Visit store
            <ArrowUpRight size={16} strokeWidth={2.4} />
          </span>
        </div>
      </div>
    </ConceptShell>
  );
}
