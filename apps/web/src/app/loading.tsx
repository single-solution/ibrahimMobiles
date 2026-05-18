import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

/**
 * Home-page-shaped fallback shown while the root route segment streams in.
 *
 * The home page is the most common first-paint target, so this skeleton
 * mirrors `app/page.tsx` (mobile + desktop variants): hero band → shop-type
 * tiles → process strip → dark grades band → visit-store card. Sub-routes
 * (shop, account, etc.) override this with their own `loading.tsx`.
 */
export default function HomeLoading() {
  return (
    <SkeletonScreen label="Loading store">
      {/* Mobile only */}
      <div className="app-page pb-2 space-y-4 md:hidden">
        <MobileHeroSkeleton />
        <MobileShopTypesSkeleton />
        <MobileProcessSkeleton />
        <MobileGradesSkeleton />
        <MobileVisitStoreSkeleton />
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <DesktopHeroSkeleton />
        <DesktopShopTypesSkeleton />
        <DesktopProcessSkeleton />
        <DesktopGradesSkeleton />
        <DesktopVisitStoreSkeleton />
      </div>
    </SkeletonScreen>
  );
}

/* ─────────────────────────── Mobile ─────────────────────────── */

function MobileHeroSkeleton() {
  return (
    <section
      className="relative -mx-4 flex items-center border-b border-[var(--color-ink-100)] bg-gradient-to-b from-[var(--color-canvas-deep)] to-[var(--color-canvas)]"
      style={{
        minHeight:
          "calc(100dvh - var(--mobile-header-h) - var(--mobile-tabbar-h))",
      }}
    >
      <div className="flex w-full flex-col items-center gap-6 px-4 pb-24 pt-8">
        <Skeleton shape="pill" className="h-6 w-56" />
        <Skeleton className="h-[110px] w-64" />
        <Skeleton className="h-[88px] w-64" />
        <div className="grid w-full grid-cols-3 items-center gap-1.5 pt-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[3/4] w-full" />
          ))}
        </div>
        <Skeleton shape="pill" className="h-11 w-full" />
        <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <li key={index} className="flex items-center gap-1.5">
              <Skeleton shape="circle" className="size-3" />
              <Skeleton shape="text" className="h-3 w-24" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MobileShopTypesSkeleton() {
  return (
    <section className="app-section">
      <div className="mb-3 space-y-2">
        <Skeleton shape="text" className="h-3 w-32" />
        <Skeleton className="h-[88px] w-full" />
        <Skeleton shape="text" className="h-3 w-3/4" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-[110px] flex-row items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3.5"
          >
            <Skeleton className="size-11 rounded-[var(--radius-lg)]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton shape="text" className="h-4 w-24" />
                <Skeleton shape="pill" className="h-4 w-10" />
              </div>
              <Skeleton shape="text" className="h-3 w-3/4" />
              <Skeleton shape="text" className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MobileProcessSkeleton() {
  return (
    <section className="app-section">
      <div className="mb-7 flex flex-col items-center gap-2 text-center">
        <Skeleton shape="text" className="h-3 w-28" />
        <Skeleton className="h-[88px] w-72" />
        <Skeleton shape="text" className="h-3 w-3/4" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)]"
          >
            <div className="flex items-center gap-2.5 bg-[var(--color-ink-900)] px-3.5 py-3">
              <Skeleton shape="circle" className="size-8" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton shape="text" className="h-2.5 w-16 bg-white/20" />
                <Skeleton shape="text" className="h-3 w-32 bg-white/20" />
              </div>
            </div>
            <ol className="divide-y divide-[var(--color-ink-100)]">
              {Array.from({ length: 4 }).map((_, stepIndex) => (
                <li key={stepIndex} className="flex items-start gap-2.5 px-3.5 py-3">
                  <Skeleton shape="circle" className="size-6 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton shape="text" className="h-3 w-32" />
                    <Skeleton shape="text" className="h-3 w-full" />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

function MobileGradesSkeleton() {
  return (
    <section className="-mx-4 mt-20 bg-[var(--color-ink-900)] px-4 py-14">
      <div className="flex flex-col items-center gap-3 text-center">
        <Skeleton shape="text" className="h-3 w-24 bg-white/15" />
        <Skeleton className="h-[88px] w-72 bg-white/15" />
        <Skeleton shape="text" className="h-3 w-3/4 bg-white/15" />
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-2.5">
        {Array.from({ length: 6 }).map((_, index) => (
          <li
            key={index}
            className="flex flex-col gap-2 rounded-[14px] border border-white/10 bg-white/[0.06] p-3"
          >
            <Skeleton shape="pill" className="h-5 w-20 bg-white/15" />
            <Skeleton shape="text" className="h-3 w-full bg-white/15" />
            <Skeleton shape="text" className="h-3 w-2/3 bg-white/15" />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MobileVisitStoreSkeleton() {
  return (
    <section className="app-section">
      <div className="mb-7 flex flex-col items-center gap-2 text-center">
        <Skeleton shape="text" className="h-3 w-32" />
        <Skeleton className="h-[88px] w-72" />
        <Skeleton shape="text" className="h-3 w-3/4" />
      </div>
      <div className="overflow-hidden rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
        <Skeleton className="aspect-[16/9] w-full rounded-none" />
        <div className="flex items-start gap-2.5 p-3.5">
          <Skeleton shape="circle" className="size-8" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton shape="text" className="h-4 w-3/4" />
            <Skeleton shape="text" className="h-3 w-full" />
          </div>
        </div>
        <div className="space-y-3 border-t border-[var(--color-ink-100)] p-3.5">
          <div className="space-y-1.5">
            <Skeleton shape="text" className="h-3 w-28" />
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} shape="pill" className="h-5 w-16" />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Skeleton shape="text" className="h-3 w-20" />
            <Skeleton shape="text" className="h-4 w-2/3" />
            <Skeleton shape="text" className="h-3 w-3/4" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Desktop ─────────────────────────── */

function DesktopHeroSkeleton() {
  return (
    <section className="relative flex min-h-[calc(100dvh-var(--desktop-header-h))] items-center border-b border-[var(--color-ink-100)] bg-gradient-to-b from-[var(--color-canvas-deep)] to-[var(--color-canvas)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-6 py-16">
        <Skeleton shape="pill" className="h-7 w-80" />
        <Skeleton className="h-[150px] w-[640px] max-w-full" />
        <Skeleton className="h-[120px] w-[480px] max-w-full" />
        <div className="grid w-full grid-cols-5 items-center gap-2 pt-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[3/4] w-full" />
          ))}
        </div>
        <Skeleton shape="pill" className="h-12 w-44" />
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton shape="circle" className="size-3.5" />
              <Skeleton shape="text" className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DesktopSectionHeaderSkeleton() {
  return (
    <div className="max-w-2xl space-y-3">
      <Skeleton shape="text" className="h-3 w-36" />
      <Skeleton className="h-[88px] w-full max-w-xl" />
      <Skeleton shape="text" className="h-4 w-2/3" />
    </div>
  );
}

function DesktopShopTypesSkeleton() {
  return (
    <section className="mx-auto max-w-[1440px] px-6 py-24">
      <DesktopSectionHeaderSkeleton />
      <div className="mt-12 grid grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-[240px] flex-col rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-6"
          >
            <Skeleton className="size-12 rounded-[var(--radius-lg)]" />
            <div className="mt-4 flex flex-1 flex-col gap-2">
              <Skeleton shape="text" className="h-6 w-32" />
              <Skeleton shape="text" className="h-3 w-3/4" />
              <ul className="mt-4 space-y-2">
                {Array.from({ length: 3 }).map((_, chipIndex) => (
                  <li key={chipIndex} className="flex items-center gap-1.5">
                    <Skeleton shape="circle" className="size-3" />
                    <Skeleton shape="text" className="h-3 w-32" />
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-4">
                <Skeleton shape="text" className="h-4 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DesktopProcessSkeleton() {
  return (
    <section className="mx-auto max-w-[1440px] px-6 py-24">
      <DesktopSectionHeaderSkeleton />
      <div className="mt-8 grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]"
          >
            <div className="flex items-center gap-3 bg-[var(--color-ink-900)] px-6 py-4">
              <Skeleton shape="circle" className="size-9 bg-white/15" />
              <div className="min-w-0 space-y-1.5">
                <Skeleton shape="text" className="h-2.5 w-16 bg-white/20" />
                <Skeleton shape="text" className="h-3.5 w-32 bg-white/20" />
              </div>
            </div>
            <ol className="flex flex-1 flex-col gap-4 p-6">
              {Array.from({ length: 4 }).map((_, stepIndex) => (
                <li key={stepIndex} className="flex items-start gap-3">
                  <Skeleton shape="circle" className="size-7 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton shape="text" className="h-3.5 w-40" />
                    <Skeleton shape="text" className="h-3 w-full" />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

function DesktopGradesSkeleton() {
  return (
    <section className="bg-[var(--color-ink-900)] py-24">
      <div className="mx-auto max-w-[1440px] px-6">
        <div className="grid grid-cols-[1fr_2fr] gap-12">
          <div className="space-y-4">
            <Skeleton shape="text" className="h-3 w-28 bg-white/15" />
            <Skeleton className="h-[160px] w-full bg-white/15" />
            <Skeleton shape="text" className="h-4 w-full bg-white/15" />
            <Skeleton shape="text" className="h-4 w-3/4 bg-white/15" />
            <Skeleton shape="text" className="h-4 w-40 bg-white/15" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-white/10 bg-white/5 p-5"
              >
                <Skeleton shape="pill" className="h-5 w-24 bg-white/15" />
                <Skeleton shape="text" className="h-3 w-full bg-white/15" />
                <Skeleton shape="text" className="h-3 w-2/3 bg-white/15" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DesktopVisitStoreSkeleton() {
  return (
    <section className="mx-auto max-w-[1440px] px-6 py-24">
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="grid grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col gap-7 p-10">
            <div className="space-y-3">
              <Skeleton shape="text" className="h-3 w-32" />
              <Skeleton className="h-[160px] w-full" />
              <Skeleton shape="text" className="h-4 w-full" />
              <Skeleton shape="text" className="h-4 w-3/4" />
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="size-9 shrink-0 rounded-[var(--radius-md)]" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton shape="text" className="h-4 w-3/4" />
                  <Skeleton shape="text" className="h-3 w-full" />
                  <Skeleton shape="text" className="h-3 w-1/2" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton shape="text" className="h-3 w-32" />
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} shape="pill" className="h-6 w-16" />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton shape="text" className="h-3 w-20" />
                <Skeleton shape="text" className="h-4 w-3/4" />
                <Skeleton shape="text" className="h-3 w-2/3" />
              </div>
            </div>
          </div>
          <Skeleton className="min-h-[420px] w-full rounded-none" />
        </div>
      </div>
    </section>
  );
}
