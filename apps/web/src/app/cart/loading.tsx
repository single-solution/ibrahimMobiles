import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

const CART_LINE_COUNT = 3;

/**
 * Exact-match skeleton for `CartView` (`@/components/cart/CartView.tsx`).
 *
 *   ← back-to-shop link (tiny)
 *   ↳ "Your cart" headline + item-count subtitle
 *   ↳ 2-col grid on md+: list of cart lines (left) + order summary card (right)
 *     - mobile collapses to 1 column with summary below.
 *   ↳ each cart line: 80px square thumbnail + brand chip + title + chips +
 *     quantity stepper + line total.
 *
 * `CartView` is a Client Component (it reads from `useCart()` /
 * localStorage) — the loading.tsx only flashes during the brief moment
 * before hydration completes, then the real view takes over. Match the
 * empty-state path is intentionally skipped here: skeleton always shows
 * the "have items" shape because that's the common case.
 */
export default function CartLoading() {
  return (
    <SkeletonScreen label="Loading cart">
      <div className="mx-auto max-w-[1100px] px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8">
        <div className="flex flex-col gap-3">
          <Skeleton shape="text" className="h-3 w-28" />
          <Skeleton shape="text" className="h-9 w-44 md:h-12 md:w-56" />
          <Skeleton shape="text" className="h-3.5 w-56" />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px]">
          <ul className="divide-y divide-[var(--color-ink-100)] rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
            {Array.from({ length: CART_LINE_COUNT }).map((_, index) => (
              <CartLineSkeleton key={index} />
            ))}
          </ul>

          <aside className="space-y-3">
            <OrderSummarySkeleton />
          </aside>
        </div>
      </div>
    </SkeletonScreen>
  );
}

function CartLineSkeleton() {
  return (
    <li className="flex gap-4 p-4">
      <Skeleton className="aspect-square w-20 shrink-0 rounded-[var(--radius-md)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton shape="text" className="h-2.5 w-20" />
            <Skeleton shape="text" className="h-4 w-3/4" />
          </div>
          <Skeleton shape="circle" className="size-8 shrink-0" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton shape="pill" className="h-4 w-14" />
          <Skeleton shape="pill" className="h-4 w-16" />
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <Skeleton shape="pill" className="h-8 w-24" />
          <Skeleton shape="text" className="h-4 w-20" />
        </div>
      </div>
    </li>
  );
}

function OrderSummarySkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 md:p-5">
      <Skeleton shape="text" className="h-3 w-32" />
      <div className="mt-3 flex items-baseline justify-between">
        <Skeleton shape="text" className="h-3.5 w-16" />
        <Skeleton shape="text" className="h-4 w-24" />
      </div>
      <div className="mt-1 space-y-1.5">
        <Skeleton shape="text" className="h-3 w-full" />
        <Skeleton shape="text" className="h-3 w-2/3" />
      </div>
      <Skeleton shape="pill" className="mt-4 h-11 w-full" />
    </div>
  );
}
