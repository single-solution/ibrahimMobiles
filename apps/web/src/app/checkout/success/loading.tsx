import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

/**
 * Checkout success fallback — a single hero card with a confirmation
 * eyebrow, big order number, and primary CTA. Mirrors `CheckoutSuccessView`.
 */
const LOYALTY_PILL_COUNT = 2;

export default function CheckoutSuccessLoading() {
  return (
    <SkeletonScreen
      label="Loading confirmation"
      className="mx-auto max-w-2xl px-4 pb-24 pt-12 md:px-6 md:pb-16 md:pt-16"
    >
      <div className="flex flex-col items-center gap-5 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-sm)] md:p-10">
        <Skeleton shape="circle" className="size-14" />
        <Skeleton shape="text" className="h-3 w-32" />
        <Skeleton shape="text" className="h-10 w-3/4" />
        <Skeleton shape="text" className="h-4 w-2/3" />

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {Array.from({ length: LOYALTY_PILL_COUNT }).map((_, index) => (
            <Skeleton key={index} shape="pill" className="h-7 w-32" />
          ))}
        </div>

        <div className="mt-2 grid w-full grid-cols-1 gap-2 md:grid-cols-2">
          <Skeleton shape="pill" className="h-11 w-full" />
          <Skeleton shape="pill" className="h-11 w-full" />
        </div>
      </div>
    </SkeletonScreen>
  );
}
