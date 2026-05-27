import { AdminShell } from "@/components/layout/AdminShell";
import { SalesWorkspaceSkeleton } from "@/components/loading/SalesWorkspaceSkeleton";
import { adminWorkspacePageClass } from "@/components/shared/adminWorkspaceUi";
import { SkeletonScreen } from "@/components/ui/Skeleton";

export default function OrdersLoading() {
  return (
    <SkeletonScreen label="Loading orders">
      <AdminShell contentClassName={adminWorkspacePageClass}>
        <section className="flex min-h-0 flex-1 flex-col">
          <SalesWorkspaceSkeleton />
        </section>
      </AdminShell>
    </SkeletonScreen>
  );
}
