import { AdminShell } from "@/components/AdminShell";
import { SalesWorkspaceSkeleton } from "@/components/loading/SalesWorkspaceSkeleton";
import { SkeletonScreen } from "@/components/ui/Skeleton";

export default function CustomersLoading() {
  return (
    <SkeletonScreen label="Loading customers">
      <AdminShell contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-1.5 md:p-2">
        <section className="flex min-h-0 flex-1 flex-col">
          <SalesWorkspaceSkeleton />
        </section>
      </AdminShell>
    </SkeletonScreen>
  );
}
