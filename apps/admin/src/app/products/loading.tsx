import { AdminShell } from "@/components/layout/AdminShell";
import { CatalogWorkspaceSkeleton } from "@/components/loading/CatalogWorkspaceSkeleton";
import { adminCatalogPageClass } from "@/components/shared/adminWorkspaceUi";
import { SkeletonScreen } from "@/components/ui/Skeleton";

export default function ProductsLoading() {
  return (
    <SkeletonScreen label="Loading products">
      <AdminShell contentClassName={adminCatalogPageClass}>
        <section className="flex min-h-0 flex-1 flex-col">
          <CatalogWorkspaceSkeleton />
        </section>
      </AdminShell>
    </SkeletonScreen>
  );
}
