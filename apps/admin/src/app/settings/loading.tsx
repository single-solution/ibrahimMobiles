import { AdminShell } from "@/components/layout/AdminShell";
import { SettingsWorkspaceSkeleton } from "@/components/loading/SettingsWorkspaceSkeleton";
import { SkeletonScreen } from "@/components/ui/Skeleton";
import { adminWorkspacePageClass } from "@/components/shared/adminWorkspaceUi";

export default function SettingsLoading() {
  return (
    <SkeletonScreen label="Loading settings">
      <AdminShell contentClassName={adminWorkspacePageClass}>
        <section className="flex min-h-0 flex-1 flex-col">
          <SettingsWorkspaceSkeleton />
        </section>
      </AdminShell>
    </SkeletonScreen>
  );
}
