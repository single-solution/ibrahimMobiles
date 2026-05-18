import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

const CONVERSATION_ROW_COUNT = 8;

/**
 * Conversations view shows threads (each thread = avatar + last-message
 * preview + timestamp), not a tabular grid. Skeleton mirrors that shape:
 * a scrollable list with one row per conversation.
 */
export default function ConversationsLoading() {
  return (
    <AdminPageSkeleton
      label="Loading conversations"
      eyebrowWidthClass="w-20"
      titleWidthClass="w-48"
      hasDescription
    >
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
        <ul className="divide-y divide-[var(--color-ink-100)]">
          {Array.from({ length: CONVERSATION_ROW_COUNT }).map((_, index) => (
            <li key={index} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton shape="circle" className="size-9" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton shape="text" className="h-3.5 w-32" />
                  <Skeleton shape="text" className="h-3 w-12" />
                </div>
                <Skeleton shape="text" className="h-3 w-3/4" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AdminPageSkeleton>
  );
}
