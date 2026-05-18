import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Skeleton } from "@/components/ui/Skeleton";
import { ActivityEntry, connectDB } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { toActivityResponse, type ActivityEntryLean } from "@/lib/serializers/activity";

export const dynamic = "force-dynamic";

const RECENT_ACTIVITY_LIMIT = 200;
const ACTIVITY_FALLBACK_ROWS = 14;

export default async function AdminActivityPage() {
  await requirePageSession("/activity");

  return (
    <AdminShell>
      <PageTitle
        eyebrow="Operations"
        title="Activity log"
        description="Every change made by admins, with timestamps and actors."
      />
      <section className="mt-8">
        <Suspense fallback={<ActivityFallback />}>
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

function ActivityFallback() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
      <ul className="divide-y divide-[var(--color-ink-100)]">
        {Array.from({ length: ACTIVITY_FALLBACK_ROWS }).map((_, index) => (
          <li key={index} className="flex items-center gap-3 px-4 py-3">
            <Skeleton shape="circle" className="size-2 shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton shape="text" className="h-3.5 w-2/3" />
            </div>
            <Skeleton shape="text" className="h-3 w-16 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}
