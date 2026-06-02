"use client";

import type { ComponentType, ReactNode } from "react";
import { Camera, Gamepad2, Headphones, Laptop, Plane, Watch } from "lucide-react";

/**
 * Shared building blocks for the throwaway hero-banner concept previews.
 * Self-contained so the preview route can be deleted in one folder once a
 * direction is chosen. Sample products are deliberately multi-category
 * (camera, laptop, audio, wearable, gaming, drone) to prove the store is a
 * general marketplace, not a phone shop. Keyframes are scoped here rather
 * than in globals.css to avoid polluting the production stylesheet.
 */

export interface SampleProduct {
  name: string;
  category: string;
  grade: string;
  price: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

export const SAMPLE_PRODUCTS: SampleProduct[] = [
  { name: "Mirrorless Camera", category: "Cameras", grade: "A", price: "Rs 142,000", icon: Camera },
  { name: "Ultrabook 14\"", category: "Laptops", grade: "A-", price: "Rs 210,000", icon: Laptop },
  { name: "ANC Headphones", category: "Audio", grade: "B+", price: "Rs 28,500", icon: Headphones },
  { name: "Smartwatch", category: "Wearables", grade: "A", price: "Rs 39,000", icon: Watch },
  { name: "Game Console", category: "Gaming", grade: "A", price: "Rs 96,000", icon: Gamepad2 },
  { name: "Camera Drone", category: "Drones", grade: "B+", price: "Rs 118,000", icon: Plane },
];

export function PreviewStyles() {
  return (
    <style>{`
      @keyframes bp-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      @keyframes bp-marquee {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }
      @keyframes bp-rise {
        from { opacity: 0; transform: translateY(14px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .bp-float { animation: bp-float 6s ease-in-out infinite; }
      .bp-marquee { animation: bp-marquee 30s linear infinite; }
      .bp-marquee-rev { animation: bp-marquee 36s linear infinite reverse; }
      .bp-rise { animation: bp-rise 600ms var(--ease-out-quart, ease-out) both; }
      @media (prefers-reduced-motion: reduce) {
        .bp-float, .bp-marquee, .bp-marquee-rev, .bp-rise { animation: none !important; }
      }
    `}</style>
  );
}

interface ProductTileProps {
  product: SampleProduct;
  className?: string;
  /** Inline transform (e.g. a slight rotation for the scatter layout). */
  style?: React.CSSProperties;
  widthClass?: string;
}

/** Neutral, category-agnostic product card used across the concepts. */
export function ProductTile({ product, className, style, widthClass = "w-[150px]" }: ProductTileProps) {
  const Icon = product.icon;
  return (
    <div
      style={style}
      className={`group ${widthClass} shrink-0 rounded-[var(--radius-2xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-2.5 shadow-[var(--shadow-md)] transition-transform duration-300 hover:-translate-y-1 ${className ?? ""}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-canvas-deep)]">
        <span className="absolute right-2 top-2 z-10 rounded-full bg-[var(--color-accent-500)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-ink-900)]">
          {product.grade}
        </span>
        <span className="grid h-full place-items-center text-[var(--color-ink-300)]">
          <Icon size={40} strokeWidth={1.4} />
        </span>
      </div>
      <div className="mt-2 px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-700)]">
          {product.category}
        </p>
        <p className="truncate text-[13px] font-semibold text-[var(--color-ink-900)]">{product.name}</p>
        <p className="text-[13px] font-bold text-[var(--color-ink-900)]">{product.price}</p>
      </div>
    </div>
  );
}

interface ConceptShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps each concept in a consistent light hero band. Every concept uses the
 * brand's warm gradient (no dark backgrounds, per the brief).
 */
export function ConceptShell({ children, className }: ConceptShellProps) {
  return (
    <section
      className={`relative flex min-h-[78vh] items-center overflow-hidden border-b border-[var(--color-ink-100)] px-5 py-12 md:min-h-[68vh] md:px-12 ${className ?? ""}`}
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-accent-50) 62%, var(--color-canvas)) 0%, color-mix(in srgb, var(--color-canvas-deep) 22%, var(--color-canvas)) 55%, var(--color-canvas) 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-[1180px]">{children}</div>
    </section>
  );
}

/** Shared category pill used in the concept heroes (mirrors the live hero). */
export function ScopePill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-100)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-800)]">
      {children}
    </span>
  );
}
