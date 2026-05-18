import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

/**
 * Orders list fallback — back link → header → filter pills → list of order
 * rows. Each row mirrors the live `OrdersListView` row anatomy (status
 * header strip + body with title, totals, and chevron).
 */
const ORDER_ROW_COUNT = 4;
const FILTER_PILL_COUNT = 4;

export default function OrdersListLoading() {
  return (
    <SkeletonScreen
      label="Loading orders"
      className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8"
    >
      <Skeleton shape="text" className="h-3 w-32" />

      <div className="mt-3 space-y-2">
        <Skeleton shape="text" className="h-10 w-48" />
        <Skeleton shape="text" className="h-3 w-2/3" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {Array.from({ length: FILTER_PILL_COUNT }).map((_, index) => (
          <Skeleton key={index} shape="pill" className="h-9 w-24" />
        ))}
      </div>

      <ul className="mt-5 space-y-3">
        {Array.from({ length: ORDER_ROW_COUNT }).map((_, index) => (
          <li
            key={index}
            className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-4 py-2.5 md:px-5">
              <div className="flex items-center gap-2">
                <Skeleton shape="text" className="h-3 w-24" />
                <Skeleton shape="text" className="h-3 w-20" />
              </div>
              <Skeleton shape="pill" className="h-5 w-24" />
            </div>
            <div className="flex items-center gap-3 p-3 md:p-4">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton shape="text" className="h-4 w-3/4" />
                <Skeleton shape="text" className="h-3 w-1/3" />
              </div>
              <div className="space-y-1.5 text-right">
                <Skeleton shape="text" className="ml-auto h-4 w-20" />
                <Skeleton shape="text" className="ml-auto h-3 w-14" />
              </div>
              <Skeleton shape="circle" className="hidden size-4 md:block" />
            </div>
          </li>
        ))}
      </ul>
    </SkeletonScreen>
  );
}
