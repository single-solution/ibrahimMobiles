import { Suspense } from "react";
import { getStoreSettings } from "@store/db";

import { Shell } from "@/components/layout/Shell";
import { Settings } from "@/app/settings/_components/Settings";
import { SettingsWorkspaceSkeleton } from "@/components/loading/SettingsWorkspaceSkeleton";
import { adminWorkspacePageClass } from "@/components/shared/workspaceUi";
import { requirePagePermission } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requirePagePermission("settings_view", "/settings");

  return (
    <Shell contentClassName={adminWorkspacePageClass}>
      <section className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<SettingsWorkspaceSkeleton />}>
          <SettingsData />
        </Suspense>
      </section>
    </Shell>
  );
}

async function SettingsData() {
  const settings = await getStoreSettings();
  return <Settings initialSettings={settings} />;
}
