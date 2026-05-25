import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { ActivityFeed } from "@/components/ActivityFeed";
import { ListWorkspaceSkeleton } from "@/components/loading/ListWorkspaceSkeleton";
import { adminListPageClass } from "@/components/workspace/adminWorkspaceUi";
import { ActivityEntry, connectDB } from "@store/db";

import { requirePagePermission } from "@/lib/server/requirePageSession";
import { toActivityResponse, type ActivityEntryLean } from "@/lib/serializers/activity";

export const dynamic = "force-dynamic";

const RECENT_ACTIVITY_LIMIT = 200;

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
  await connectDB();
  const docs = await ActivityEntry.find()
    .sort({ createdAt: -1 })
    .limit(RECENT_ACTIVITY_LIMIT)
    .lean<ActivityEntryLean[]>();
  const entries = docs.map(toActivityResponse);
  return <ActivityFeed entries={entries} />;
}
