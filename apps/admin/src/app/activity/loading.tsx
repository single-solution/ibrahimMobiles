import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

const ACTIVITY_ROW_COUNT = 14;

/**
 * Activity feed renders a vertical timeline (actor avatar + action +
 * timestamp), not a tabular grid. Each row in the real `ActivityFeed`
 * is roughly: small circular indicator → 1 line of action text → muted
 * timestamp on the right.
 */
export default function ActivityLoading() {
  return (
    <AdminPageSkeleton
      label="Loading activity log"
      eyebrowWidthClass="w-20"
      titleWidthClass="w-32"
      hasDescription
    >
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
        <ul className="divide-y divide-[var(--color-ink-100)]">
          {Array.from({ length: ACTIVITY_ROW_COUNT }).map((_, index) => (
            <li key={index} className="flex items-center gap-3 px-4 py-3">
              <Skeleton shape="circle" className="size-2 shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton shape="text" className="h-3.5 w-2/3" />
              </div>
              <Skeleton shape="text" className="h-3 w-16 shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </AdminPageSkeleton>
  );
}
