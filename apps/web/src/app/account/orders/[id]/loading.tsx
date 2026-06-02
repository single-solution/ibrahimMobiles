"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

/**
 * Order detail fallback. The order number is in the URL (`[id]`), so the
 * back link and headline paint live the moment the row is tapped. Only
 * the timeline, items, totals, and sidebar (which all depend on the
 * server-loaded order) are skeletoned.
 */
const ITEM_ROW_COUNT = 2;
const TIMELINE_STEP_COUNT = 4;
const SIDEBAR_SECTION_COUNT = 3;

export default function OrderDetailLoading() {
  const params = useParams<{ id: string }>();
  const orderNumber = params?.id ?? "";

  return (
    <SkeletonScreen
      label="Loading order"
      className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8"
    >
      <Link
        href="/account/orders"
        className="cta-arrow tap inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-ink-500)] hover:text-[var(--color-ink-800)]"
      >
        <ArrowLeft size={13} />
        Back to orders
      </Link>

      <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            Order
          </p>
          <h1 className="font-mono text-[24px] font-semibold tracking-tight text-[var(--color-ink-900)] md:text-[30px]">
            {orderNumber || <Skeleton shape="text" className="h-9 w-56 inline-block" />}
          </h1>
          <Skeleton shape="text" className="h-3 w-40" />
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <Skeleton shape="pill" className="h-6 w-32" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:mt-8 md:grid-cols-[1fr_360px] md:gap-6 lg:gap-8">
        <div className="space-y-4">
          <section className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
            <div className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-4 py-3 md:px-5">
              <Skeleton shape="text" className="h-3 w-28" />
            </div>
            <ul className="divide-y divide-[var(--color-ink-100)]">
              {Array.from({ length: ITEM_ROW_COUNT }).map((_, index) => (
                <li key={index} className="flex items-center gap-3 p-4 md:p-5">
                  <Skeleton className="size-12 shrink-0 rounded-[var(--radius-md)]" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton shape="text" className="h-3 w-20" />
                    <Skeleton shape="text" className="h-3 w-3/4" />
                  </div>
                  <div className="space-y-1.5 text-right">
                    <Skeleton shape="text" className="ml-auto h-3.5 w-16" />
                    <Skeleton shape="text" className="ml-auto h-2.5 w-10" />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2 rounded-[var(--radius-2xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] md:p-5">
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
              className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
            >
              <div className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-4 py-3 md:px-5">
                <Skeleton shape="text" className="h-3 w-32" />
              </div>
              <div className="p-4 md:p-5">
                {sectionIndex === 0 ? (
                  <ol className="space-y-3">
                    {Array.from({ length: TIMELINE_STEP_COUNT }).map((_, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-3">
                        <Skeleton shape="circle" className="size-5 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1.5 pb-1">
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
            </div>
          ))}
        </aside>
      </div>
    </SkeletonScreen>
  );
}
