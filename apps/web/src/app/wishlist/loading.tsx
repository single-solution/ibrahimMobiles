import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

const WISHLIST_CARD_COUNT = 4;

/**
 * Exact-match skeleton for `WishlistView` (`@/components/wishlist/WishlistView.tsx`).
 *
 *   header band — "Saved for later" eyebrow / "Your wishlist · N" title /
 *   "Clear all" button, with a 1px ink-100 divider underneath
 *   ↳ 1-col on mobile, 2-col on md+ grid of saved-item cards
 *   ↳ each card: 96px square thumbnail (left), brand+category line +
 *     model name (top right), trash icon (top right corner), price (bottom),
 *     bordered footer with "View details" CTA spanning the full width.
 *
 * Wishlist is a Client Component reading from localStorage; loading.tsx
 * shows for the brief moment before client hydration.
 */
export default function WishlistLoading() {
  return (
    <SkeletonScreen label="Loading wishlist">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 md:px-6 md:pt-10 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-ink-100)] pb-5 md:pb-6">
          <div className="space-y-2">
            <Skeleton shape="text" className="h-3 w-28" />
            <Skeleton shape="text" className="h-8 w-56 md:h-12 md:w-72" />
          </div>
          <Skeleton shape="pill" className="h-8 w-24" />
        </header>

        <ul className="mt-5 grid gap-3 md:mt-6 md:grid-cols-2 md:gap-4">
          {Array.from({ length: WISHLIST_CARD_COUNT }).map((_, index) => (
            <WishlistCardSkeleton key={index} />
          ))}
        </ul>
      </div>
    </SkeletonScreen>
  );
}

function WishlistCardSkeleton() {
  return (
    <li>
      <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
        <div className="flex flex-1 gap-3 p-3 md:gap-4 md:p-4">
          <Skeleton className="aspect-square w-24 shrink-0 rounded-[var(--radius-md)] md:w-28" />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton shape="text" className="h-2.5 w-32" />
                <Skeleton shape="text" className="h-4 w-3/4 md:h-4.5" />
              </div>
              <Skeleton shape="circle" className="size-8 shrink-0" />
            </div>
            <Skeleton shape="text" className="mt-auto h-5 w-24" />
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-3 py-2 md:px-4 md:py-2.5">
          <Skeleton shape="pill" className="h-8 flex-1" />
        </div>
      </div>
    </li>
  );
}
