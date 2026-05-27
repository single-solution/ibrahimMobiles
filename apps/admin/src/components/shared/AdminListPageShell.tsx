import type { ReactNode } from "react";

import { AdminShell } from "@/components/layout/AdminShell";
import { SkeletonScreen } from "@/components/ui/Skeleton";
import { adminListPageClass } from "@/components/shared/adminWorkspaceUi";
import { ListWorkspaceSkeleton } from "@/components/loading/ListWorkspaceSkeleton";

export function AdminListPageShell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <SkeletonScreen label={label}>
      <AdminShell contentClassName={adminListPageClass}>
        <section className="flex min-h-0 flex-1 flex-col">{children}</section>
      </AdminShell>
    </SkeletonScreen>
  );
}

export function AdminListPageLoading({ label }: { label: string }) {
  return (
    <AdminListPageShell label={label}>
      <ListWorkspaceSkeleton />
    </AdminListPageShell>
  );
}
