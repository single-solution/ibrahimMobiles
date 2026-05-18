import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

/**
 * Order tracking fallback — header + lookup form. Covers the route-segment
 * transition before the client `TrackView` mounts.
 */
export default function TrackLoading() {
  return (
    <SkeletonScreen
      label="Loading order tracker"
      className="mx-auto max-w-2xl px-4 pb-24 pt-8 md:px-6 md:pb-16 md:pt-14"
    >
      <div className="space-y-3 text-center">
        <Skeleton shape="pill" className="mx-auto h-5 w-32" />
        <Skeleton shape="text" className="mx-auto h-10 w-2/3" />
        <Skeleton shape="text" className="mx-auto h-3 w-3/4" />
      </div>

      <div className="mt-8 space-y-4 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] md:p-6">
        <div className="space-y-1.5">
          <Skeleton shape="text" className="h-3 w-32" />
          <Skeleton className="h-11 w-full rounded-[var(--radius-md)]" />
        </div>
        <div className="space-y-1.5">
          <Skeleton shape="text" className="h-3 w-28" />
          <Skeleton className="h-11 w-full rounded-[var(--radius-md)]" />
        </div>
        <Skeleton shape="pill" className="h-11 w-full" />
      </div>
    </SkeletonScreen>
  );
}
