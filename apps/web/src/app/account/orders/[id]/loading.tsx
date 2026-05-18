import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

/**
 * Order detail fallback — back link → status header card → 2-column layout
 * (items + totals on the left, timeline + delivery + support on the right).
 */
const ITEM_ROW_COUNT = 2;
const TIMELINE_STEP_COUNT = 4;
const SIDEBAR_SECTION_COUNT = 3;

export default function OrderDetailLoading() {
  return (
    <SkeletonScreen
      label="Loading order"
      className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8"
    >
      <Skeleton shape="text" className="h-3 w-32" />

      <div className="mt-4 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-4 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/40 p-5 md:flex-row md:items-center md:justify-between md:p-7">
          <div className="space-y-2">
            <Skeleton shape="text" className="h-3 w-32" />
            <Skeleton shape="text" className="h-9 w-56" />
            <Skeleton shape="text" className="h-3 w-40" />
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <Skeleton shape="pill" className="h-6 w-32" />
            <Skeleton shape="text" className="h-8 w-28" />
          </div>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-[1fr_320px] md:gap-8 md:p-7 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className="space-y-3">
              <Skeleton shape="text" className="h-3 w-28" />
              <ul className="divide-y divide-[var(--color-ink-100)] rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
                {Array.from({ length: ITEM_ROW_COUNT }).map((_, index) => (
                  <li key={index} className="flex gap-3 p-4">
                    <Skeleton className="size-16 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton shape="text" className="h-3 w-20" />
                      <Skeleton shape="text" className="h-4 w-3/4" />
                      <div className="flex gap-1.5">
                        <Skeleton shape="pill" className="h-5 w-14" />
                        <Skeleton shape="pill" className="h-5 w-16" />
                      </div>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <Skeleton shape="text" className="ml-auto h-4 w-20" />
                      <Skeleton shape="text" className="ml-auto h-3 w-10" />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 md:p-5">
              <Skeleton shape="text" className="h-3 w-24" />
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between gap-2 py-1">
                  <Skeleton shape="text" className="h-3 w-32" />
                  <Skeleton shape="text" className="h-3 w-20" />
                </div>
              ))}
            </section>
          </div>

          <aside className="space-y-4">
            {Array.from({ length: SIDEBAR_SECTION_COUNT }).map((_, sectionIndex) => (
              <div
                key={sectionIndex}
                className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 md:p-5"
              >
                <Skeleton shape="text" className="h-3 w-32" />
                {sectionIndex === 0 ? (
                  <ol className="space-y-3">
                    {Array.from({ length: TIMELINE_STEP_COUNT }).map((_, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-3">
                        <Skeleton shape="circle" className="size-6 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Skeleton shape="text" className="h-3.5 w-2/3" />
                          <Skeleton shape="text" className="h-3 w-1/3" />
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="space-y-2">
                    <Skeleton shape="text" className="h-3 w-full" />
                    <Skeleton shape="text" className="h-3 w-3/4" />
                    <Skeleton shape="text" className="h-3 w-1/2" />
                  </div>
                )}
              </div>
            ))}
          </aside>
        </div>
      </div>
    </SkeletonScreen>
  );
}
