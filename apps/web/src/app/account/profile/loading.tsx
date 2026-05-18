import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

/**
 * Profile editor fallback — back link → header → 2-column on desktop
 * (contact details form + addresses list), single column on mobile.
 */
const CONTACT_FIELD_COUNT = 3;
const ADDRESS_CARD_COUNT = 2;

export default function ProfileLoading() {
  return (
    <SkeletonScreen
      label="Loading profile"
      className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8"
    >
      <Skeleton shape="text" className="h-3 w-32" />

      <div className="mt-3 space-y-2">
        <Skeleton shape="text" className="h-10 w-48" />
        <Skeleton shape="text" className="h-3 w-2/3" />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1fr] md:gap-8">
        <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] md:p-6">
          <div className="space-y-2">
            <Skeleton shape="text" className="h-3 w-32" />
            <Skeleton shape="text" className="h-5 w-1/2" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: CONTACT_FIELD_COUNT }).map((_, index) => (
              <div key={index} className="space-y-1.5">
                <Skeleton shape="text" className="h-3 w-24" />
                <Skeleton className="h-11 w-full rounded-[var(--radius-md)]" />
              </div>
            ))}
          </div>
          <Skeleton shape="pill" className="h-11 w-32" />
        </section>

        <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] md:p-6">
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-2">
              <Skeleton shape="text" className="h-3 w-32" />
              <Skeleton shape="text" className="h-5 w-40" />
            </div>
            <Skeleton shape="pill" className="h-9 w-32" />
          </div>
          <ul className="space-y-3">
            {Array.from({ length: ADDRESS_CARD_COUNT }).map((_, index) => (
              <li
                key={index}
                className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/40 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <Skeleton shape="text" className="h-4 w-1/3" />
                  <Skeleton shape="pill" className="h-5 w-16" />
                </div>
                <Skeleton shape="text" className="h-3 w-full" />
                <Skeleton shape="text" className="h-3 w-3/4" />
                <Skeleton shape="text" className="h-3 w-1/2" />
                <div className="flex items-center gap-2 pt-1">
                  <Skeleton shape="pill" className="h-8 w-20" />
                  <Skeleton shape="pill" className="h-8 w-20" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SkeletonScreen>
  );
}
