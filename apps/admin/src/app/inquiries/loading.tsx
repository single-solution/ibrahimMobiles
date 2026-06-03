import { Shell } from "@/components/layout/Shell";
import { InquiriesInboxSkeleton } from "@/components/loading/InquiriesInboxSkeleton";
import { SkeletonScreen } from "@/components/ui/Skeleton";

export default function InquiriesLoading() {
  return (
    <SkeletonScreen label="Loading inquiries">
      <Shell contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-1.5 md:p-2">
        <section className="flex min-h-0 flex-1 flex-col">
          <InquiriesInboxSkeleton />
        </section>
      </Shell>
    </SkeletonScreen>
  );
}
