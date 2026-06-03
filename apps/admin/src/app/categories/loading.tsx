import { Shell } from "@/components/layout/Shell";
import { CatalogWorkspaceSkeleton } from "@/components/loading/CatalogWorkspaceSkeleton";
import { adminCatalogPageClass } from "@/components/shared/workspaceUi";
import { SkeletonScreen } from "@/components/ui/Skeleton";

export default function CategoriesLoading() {
  return (
    <SkeletonScreen label="Loading categories">
      <Shell contentClassName={adminCatalogPageClass}>
        <section className="flex min-h-0 flex-1 flex-col">
          <CatalogWorkspaceSkeleton />
        </section>
      </Shell>
    </SkeletonScreen>
  );
}
