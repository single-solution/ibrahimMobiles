import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

/**
 * Account overview fallback — mirrors `app/account/page.tsx`:
 *   header (eyebrow + welcome) → loyalty card → 3-up stats →
 *   2-column (recent orders list + sidebar with profile, quick actions,
 *   support).
 */
const RECENT_ORDER_ROW_COUNT = 3;
const QUICK_ACTION_COUNT = 3;

export default function AccountLoading() {
  return (
    <SkeletonScreen
      label="Loading account"
      className="mx-auto max-w-[1440px] px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8"
    >
      <AccountHeaderSkeleton />
      <LoyaltyCardSkeleton />
      <StatsRowSkeleton />

      <div className="mt-6 grid gap-6 md:mt-8 md:grid-cols-[1fr_320px] md:gap-6 lg:gap-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton shape="text" className="h-3 w-32" />
            <Skeleton shape="text" className="h-6 w-1/2" />
          </div>
          <ul className="space-y-3">
            {Array.from({ length: RECENT_ORDER_ROW_COUNT }).map((_, index) => (
              <li key={index}>
                <RecentOrderRowSkeleton />
              </li>
            ))}
          </ul>
        </div>

        <aside className="space-y-4">
          <ProfileCardSkeleton />
          <QuickActionsSkeleton />
          <SupportCardSkeleton />
        </aside>
      </div>
    </SkeletonScreen>
  );
}

function AccountHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <Skeleton shape="text" className="h-3 w-32" />
        <Skeleton shape="text" className="h-12 w-64" />
        <Skeleton shape="text" className="h-3 w-3/4" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton shape="pill" className="hidden h-8 w-56 md:block" />
        <Skeleton shape="pill" className="h-9 w-24" />
      </div>
    </div>
  );
}

function LoyaltyCardSkeleton() {
  return (
    <div className="mt-5 rounded-[var(--radius-xl)] border border-[var(--color-accent-200)] bg-gradient-to-br from-[var(--color-accent-100)] via-[var(--color-accent-50)] to-[var(--color-canvas)] p-5 md:mt-8 md:p-6">
      <div className="grid gap-5 md:grid-cols-[1fr_1px_1.1fr] md:gap-7">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton shape="circle" className="size-8" />
            <Skeleton shape="text" className="h-3 w-24" />
          </div>
          <div className="space-y-1.5">
            <Skeleton shape="text" className="h-14 w-40" />
            <Skeleton shape="text" className="h-3 w-3/4" />
          </div>
          <Skeleton shape="text" className="h-3 w-1/2" />
          <Skeleton shape="pill" className="h-9 w-40" />
        </div>
        <div className="hidden bg-[var(--color-accent-200)]/60 md:block" aria-hidden />
        <div className="space-y-3">
          <Skeleton shape="text" className="h-3 w-32" />
          <ul className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <li
                key={index}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]/85 p-3"
              >
                <Skeleton className="size-8 shrink-0 rounded-[var(--radius-md)]" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton shape="text" className="h-3.5 w-1/2" />
                  <Skeleton shape="text" className="h-3 w-3/4" />
                </div>
                <Skeleton shape="pill" className="h-5 w-12" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatsRowSkeleton() {
  return (
    <div className="mt-4 grid gap-4 md:mt-6 md:grid-cols-3 md:gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] md:p-5"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="size-8 rounded-[var(--radius-md)]" />
            <Skeleton shape="circle" className="size-4" />
          </div>
          <Skeleton shape="text" className="mt-3 h-7 w-20" />
          <Skeleton shape="text" className="mt-1 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function RecentOrderRowSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
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
      </div>
    </div>
  );
}

function ProfileCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 p-4 md:p-5">
        <Skeleton shape="circle" className="size-10" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton shape="text" className="h-4 w-1/2" />
          <Skeleton shape="text" className="h-3 w-3/4" />
        </div>
      </div>
      <div className="space-y-2 border-b border-[var(--color-ink-100)] p-4 md:p-5">
        <Skeleton shape="text" className="h-3 w-28" />
        <Skeleton shape="text" className="h-3 w-full" />
        <Skeleton shape="text" className="h-3 w-2/3" />
      </div>
      <div className="p-3 md:p-4">
        <Skeleton shape="pill" className="h-9 w-full" />
      </div>
    </div>
  );
}

function QuickActionsSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--color-ink-100)] px-4 py-3 md:px-5">
        <Skeleton shape="text" className="h-3 w-28" />
      </div>
      <ul className="divide-y divide-[var(--color-ink-100)]">
        {Array.from({ length: QUICK_ACTION_COUNT }).map((_, index) => (
          <li key={index} className="flex items-center gap-3 px-4 py-3 md:px-5">
            <Skeleton className="size-8 shrink-0 rounded-[var(--radius-md)]" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton shape="text" className="h-3.5 w-1/2" />
              <Skeleton shape="text" className="h-3 w-3/4" />
            </div>
            <Skeleton shape="circle" className="size-4" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SupportCardSkeleton() {
  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] md:p-5">
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-[var(--radius-md)]" />
        <Skeleton shape="text" className="h-4 w-32" />
      </div>
      <Skeleton shape="text" className="h-3 w-full" />
      <Skeleton shape="text" className="h-3 w-3/4" />
      <div className="flex items-center gap-2">
        <Skeleton shape="pill" className="h-10 flex-1" />
        <Skeleton className="size-9 rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}
