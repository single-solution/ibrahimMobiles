import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Mirrors the visible structure of `ProductCard` while data loads — square
 * image well + meta strip + price footer — so the shop grid, deals grid and
 * any "related products" rail keep their layout stable across the loading →
 * loaded transition (no shift, no blank cells).
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="relative aspect-square overflow-hidden bg-[var(--color-canvas-deep)]">
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
        <Skeleton shape="pill" className="absolute right-1.5 top-1.5 h-5 w-14 md:right-3 md:top-3 md:h-6 md:w-16" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5 md:p-3">
        <div className="flex items-baseline justify-between gap-2">
          <Skeleton shape="text" className="h-3 w-16" />
          <Skeleton shape="text" className="h-3 w-12" />
        </div>
        <Skeleton shape="text" className="h-4 w-3/4" />
        <div className="mt-1 flex gap-1.5 md:gap-2">
          <Skeleton shape="pill" className="h-5 w-14" />
          <Skeleton shape="pill" className="h-5 w-16" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-2.5 py-2 md:px-3 md:py-2.5">
        <Skeleton shape="text" className="h-4 w-20" />
        <Skeleton shape="pill" className="h-4 w-10" />
      </div>
    </div>
  );
}

interface ProductGridSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * Convenience grid wrapper that lays out N `ProductCardSkeleton`s using the
 * same responsive columns the live `ProductGrid` uses on the shop & deals
 * pages, so swapping in real cards is a pixel-stable transition.
 */
export function ProductGridSkeleton({ count = 8, className }: ProductGridSkeletonProps) {
  return (
    <div
      className={
        className ??
        "grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-4"
      }
    >
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
