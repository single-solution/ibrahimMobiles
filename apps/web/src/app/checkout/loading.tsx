import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

/**
 * Checkout fallback — covers the brief route-segment transition before the
 * client `CheckoutView` mounts. Shape: back link → header → 2-column form
 * (contact + delivery + payment on the left, order summary on the right).
 */
const FORM_SECTION_COUNT = 4;
const SUMMARY_ROW_COUNT = 4;

export default function CheckoutLoading() {
  return (
    <SkeletonScreen
      label="Loading checkout"
      className="mx-auto max-w-[1100px] px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8"
    >
      <Skeleton shape="text" className="h-3 w-32" />

      <div className="mt-3 space-y-2">
        <Skeleton shape="text" className="h-10 w-48" />
        <Skeleton shape="text" className="h-3 w-2/3" />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {Array.from({ length: FORM_SECTION_COUNT }).map((_, index) => (
            <section
              key={index}
              className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] md:p-6"
            >
              <div className="space-y-1.5">
                <Skeleton shape="text" className="h-3 w-32" />
                <Skeleton shape="text" className="h-5 w-1/2" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, fieldIndex) => (
                  <div key={fieldIndex} className="space-y-1.5">
                    <Skeleton shape="text" className="h-3 w-24" />
                    <Skeleton className="h-11 w-full rounded-[var(--radius-md)]" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-3">
          <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 md:p-5">
            <Skeleton shape="text" className="h-3 w-28" />
            {Array.from({ length: SUMMARY_ROW_COUNT }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-2">
                <Skeleton shape="text" className="h-3 w-32" />
                <Skeleton shape="text" className="h-3 w-20" />
              </div>
            ))}
            <div className="my-2 h-px bg-[var(--color-ink-100)]" />
            <div className="flex items-center justify-between gap-2">
              <Skeleton shape="text" className="h-4 w-20" />
              <Skeleton shape="text" className="h-5 w-28" />
            </div>
            <Skeleton shape="pill" className="mt-2 h-11 w-full" />
          </div>
        </aside>
      </div>
    </SkeletonScreen>
  );
}
