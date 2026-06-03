import { Shell } from "@/components/layout/Shell";
import { SalesWorkspaceSkeleton } from "@/components/loading/SalesWorkspaceSkeleton";
import { adminWorkspacePageClass } from "@/components/shared/workspaceUi";
import { SkeletonScreen } from "@/components/ui/Skeleton";

export default function CustomersLoading() {
  return (
    <SkeletonScreen label="Loading customers">
      <Shell contentClassName={adminWorkspacePageClass}>
        <section className="flex min-h-0 flex-1 flex-col">
          <SalesWorkspaceSkeleton />
        </section>
      </Shell>
    </SkeletonScreen>
  );
}
