import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { ProductGridSkeleton } from "@/components/shared/ProductCardSkeleton";

/**
 * Deals page fallback — header + offer rail + on-sale product grid.
 * Mirrors `app/deals/page.tsx` (mobile + desktop variants).
 */
const MOBILE_DEAL_CARDS = 6;
const DESKTOP_DEAL_CARDS = 8;
const OFFER_PLACEHOLDER_COUNT = 2;

export default function DealsLoading() {
  return (
    <SkeletonScreen label="Loading deals">
      {/* Mobile only */}
      <div className="app-page pb-6 pt-3 md:hidden">
        <section className="app-section flex flex-col items-center gap-3 text-center">
          <Skeleton shape="pill" className="h-6 w-28" />
          <Skeleton shape="text" className="h-7 w-40" />
          <Skeleton shape="text" className="h-3 w-3/4" />
        </section>

        <section className="app-section">
          <Skeleton shape="text" className="mb-3 h-3 w-32" />
          <ul className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
            {Array.from({ length: OFFER_PLACEHOLDER_COUNT }).map((_, index) => (
              <li
                key={index}
                className="flex items-center gap-3 border-b border-[var(--color-ink-100)] p-3 last:border-b-0"
              >
                <Skeleton shape="circle" className="size-9 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton shape="text" className="h-3.5 w-3/4" />
                  <Skeleton shape="text" className="h-3 w-1/3" />
                </div>
                <Skeleton shape="circle" className="size-4" />
              </li>
            ))}
          </ul>
        </section>

        <section className="app-section">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton shape="text" className="h-3 w-28" />
            <Skeleton shape="text" className="h-3 w-16" />
          </div>
          <ProductGridSkeleton
            count={MOBILE_DEAL_CARDS}
            className="grid grid-cols-2 gap-2.5 sm:gap-3"
          />
        </section>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-[1440px] px-6 py-12 md:block">
        <header className="space-y-3">
          <Skeleton shape="pill" className="h-5 w-32" />
          <Skeleton shape="text" className="h-12 w-72" />
          <Skeleton shape="text" className="h-4 w-2/3" />
        </header>

        <section className="mt-16 grid grid-cols-2 gap-4">
          {Array.from({ length: OFFER_PLACEHOLDER_COUNT }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-6"
            >
              <Skeleton shape="pill" className="h-6 w-24" />
              <Skeleton shape="text" className="h-6 w-3/4" />
              <Skeleton shape="text" className="h-3 w-full" />
              <Skeleton shape="text" className="h-3 w-2/3" />
              <div className="mt-auto flex items-center justify-between gap-3">
                <Skeleton shape="text" className="h-3 w-32" />
                <Skeleton shape="pill" className="h-10 w-32" />
              </div>
            </div>
          ))}
        </section>

        <section className="mt-20 space-y-6">
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-2">
              <Skeleton shape="text" className="h-10 w-64" />
              <Skeleton shape="text" className="h-3 w-40" />
            </div>
          </div>
          <ProductGridSkeleton
            count={DESKTOP_DEAL_CARDS}
            className="grid grid-cols-4 gap-5"
          />
        </section>
      </div>
    </SkeletonScreen>
  );
}
