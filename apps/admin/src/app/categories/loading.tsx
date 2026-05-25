import { AdminShell } from "@/components/AdminShell";
import { CatalogWorkspaceSkeleton } from "@/components/loading/CatalogWorkspaceSkeleton";
import { adminCatalogPageClass } from "@/components/workspace/adminWorkspaceUi";
import { SkeletonScreen } from "@/components/ui/Skeleton";

export default function CategoriesLoading() {
  return (
    <SkeletonScreen label="Loading categories">
      <AdminShell contentClassName={adminCatalogPageClass}>
        <section className="flex min-h-0 flex-1 flex-col">
          <CatalogWorkspaceSkeleton />
        </section>
      </AdminShell>
    </SkeletonScreen>
  );
}
