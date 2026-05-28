import { Suspense } from "react";

import { AdminShell } from "@/components/layout/AdminShell";
import { ActivityFeed } from "@/app/activity/_components/ActivityFeed";
import { ListWorkspaceSkeleton } from "@/components/loading/ListWorkspaceSkeleton";
import { adminListPageClass } from "@/components/shared/adminWorkspaceUi";

import { loadAdminActivityCached } from "@/lib/cached";
import { requirePagePermission } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  await requirePagePermission("activity_view", "/activity");

  return (
    <AdminShell contentClassName={adminListPageClass}>
      <section className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<ListWorkspaceSkeleton />}>
          <ActivityData />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function ActivityData() {
  const entries = await loadAdminActivityCached();
  return <ActivityFeed entries={entries} />;
}
