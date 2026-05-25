import { Suspense } from "react";
import { getStoreSettings } from "@store/db";

import { AdminShell } from "@/components/AdminShell";
import { Settings } from "@/components/Settings";
import { ListWorkspaceSkeleton } from "@/components/loading/ListWorkspaceSkeleton";
import { adminListPageClass } from "@/components/workspace/adminWorkspaceUi";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  return (
    <AdminShell contentClassName={adminListPageClass}>
      <section className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<ListWorkspaceSkeleton />}>
          <SettingsData />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function SettingsData() {
  const settings = await getStoreSettings();
  return <Settings initialSettings={settings} />;
}
