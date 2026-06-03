import { Shell } from "@/components/layout/Shell";
import { SettingsWorkspaceSkeleton } from "@/components/loading/SettingsWorkspaceSkeleton";
import { SkeletonScreen } from "@/components/ui/Skeleton";
import { adminWorkspacePageClass } from "@/components/shared/workspaceUi";

export default function SettingsLoading() {
  return (
    <SkeletonScreen label="Loading settings">
      <Shell contentClassName={adminWorkspacePageClass}>
        <section className="flex min-h-0 flex-1 flex-col">
          <SettingsWorkspaceSkeleton />
        </section>
      </Shell>
    </SkeletonScreen>
  );
}
