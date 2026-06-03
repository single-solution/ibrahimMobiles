import type { ReactNode } from "react";

import { Shell } from "@/components/layout/Shell";
import { SkeletonScreen } from "@/components/ui/Skeleton";
import { adminListPageClass } from "@/components/shared/workspaceUi";
import { ListWorkspaceSkeleton } from "@/components/loading/ListWorkspaceSkeleton";

export function ListPageShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Shell contentClassName={adminListPageClass}>
      <section className="flex min-h-0 flex-1 flex-col">{children}</section>
    </Shell>
  );
}

export function AdminListPageLoading({ label }: { label: string }) {
  return (
    <SkeletonScreen label={label}>
      <ListPageShell>
        <ListWorkspaceSkeleton />
      </ListPageShell>
    </SkeletonScreen>
  );
}
