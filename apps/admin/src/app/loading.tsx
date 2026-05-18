import { AdminShell } from "@/components/AdminShell";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

/**
 * Dashboard-shaped fallback for the admin overview route segment.
 *
 * Exact-matches `app/page.tsx` (the dashboard) — mobile native layout
 * AND desktop layout — both wrapped in `AdminShell` so the chrome
 * (sidebar / top bar / footer) is in place from the first paint and
 * the real dashboard slots into the same DOM cells when it lands.
 *
 * Mobile:
 *   - "Overview" eyebrow + welcome title
 *   - "Today" KPI strip (4 cards in a 2×2)
 *   - "This month" KPI strip (4 cards in a 2×2)
 *   - "Recent inquiries" list (5 rows)
 *
 * Desktop:
 *   - 3 section headers, each followed by a 4-up KPI grid
 *     matching the real `<KpiCard>` chrome (label, value, hint, spark).
 */
const KPI_CARDS = 4;
const RECENT_INQUIRY_ROWS = 5;

export default function AdminDashboardLoading() {
  return (
    <SkeletonScreen label="Loading admin dashboard">
      <AdminShell>
        {/* Mobile */}
        <div className="md:hidden">
          <div className="space-y-1.5">
            <Skeleton shape="text" className="h-2.5 w-16" />
            <Skeleton shape="text" className="h-5 w-40" />
          </div>

          <MobileKpiStripSkeleton heading="Today" />
          <MobileKpiStripSkeleton heading="This month" />

          <section className="app-section">
            <div className="app-section-eyebrow">
              <Skeleton shape="text" className="h-3 w-32" />
              <Skeleton shape="text" className="h-3 w-16" />
            </div>
            <ul className="app-list">
              {Array.from({ length: RECENT_INQUIRY_ROWS }).map((_, index) => (
                <li key={index} className="app-list-row">
                  <Skeleton shape="circle" className="size-8" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Skeleton shape="text" className="h-3 w-24" />
                      <Skeleton shape="pill" className="h-3.5 w-12" />
                    </div>
                    <Skeleton shape="text" className="h-3 w-32" />
                  </div>
                  <div className="space-y-1 text-right">
                    <Skeleton shape="text" className="h-3 w-16" />
                    <Skeleton shape="text" className="h-2.5 w-10" />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          <DesktopSectionHeaderSkeleton />
          <DesktopKpiGridSkeleton />

          <DesktopSectionHeaderSkeleton />
          <DesktopKpiGridSkeleton />

          <DesktopSectionHeaderSkeleton />
          <DesktopKpiGridSkeleton />
        </div>
      </AdminShell>
    </SkeletonScreen>
  );
}

function MobileKpiStripSkeleton({ heading }: { heading: string }) {
  return (
    <section className="app-section">
      <div className="app-section-eyebrow">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-400)]">
          {heading}
        </span>
        <Skeleton shape="text" className="h-3 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: KPI_CARDS }).map((_, index) => (
          <div
            key={index}
            className="rounded-[12px] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <Skeleton shape="text" className="h-3 w-16" />
              <Skeleton className="size-6" />
            </div>
            <Skeleton shape="text" className="mt-2 h-5 w-24" />
            <Skeleton shape="text" className="mt-1 h-3 w-12" />
          </div>
        ))}
      </div>
    </section>
  );
}

function DesktopSectionHeaderSkeleton() {
  return (
    <header className="mt-8 mb-3 flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-2">
        <Skeleton shape="text" className="h-4 w-56" />
        <Skeleton shape="text" className="h-3 w-72" />
      </div>
      <Skeleton shape="text" className="h-3 w-24" />
    </header>
  );
}

function DesktopKpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: KPI_CARDS }).map((_, index) => (
        <div
          key={index}
          className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <Skeleton shape="text" className="h-3 w-24" />
            <Skeleton className="size-7" />
          </div>
          <Skeleton shape="text" className="mt-6 h-7 w-32" />
          <div className="mt-4 flex items-center justify-between gap-2">
            <Skeleton shape="text" className="h-3 w-20" />
            <Skeleton shape="text" className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
