import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { activityFeed } from "@/data/admin/activity";

export default function AdminActivityPage() {
  return (
    <AdminShell>
      <PageTitle eyebrow="Operations" title="Activity log" />
      <section className="mt-8">
        <ActivityFeed entries={activityFeed} />
      </section>
    </AdminShell>
  );
}
