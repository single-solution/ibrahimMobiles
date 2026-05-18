import { Suspense } from "react";
import { getStoreSettings } from "@store/db";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { SettingsView } from "@/components/SettingsView";
import { Skeleton } from "@/components/ui/Skeleton";

export const dynamic = "force-dynamic";

const SETTINGS_GROUP_COUNT = 4;
const FIELDS_PER_GROUP = 4;

export default async function AdminSettingsPage() {
  return (
    <AdminShell>
      <PageTitle eyebrow="Site" title="Settings" />
      <section className="mt-8">
        <Suspense fallback={<SettingsFallback />}>
          <SettingsData />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function SettingsData() {
  const settings = await getStoreSettings();
  return <SettingsView initialSettings={settings} />;
}

function SettingsFallback() {
  return (
    <div className="space-y-6">
      {Array.from({ length: SETTINGS_GROUP_COUNT }).map((_, groupIndex) => (
        <section
          key={groupIndex}
          className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]"
        >
          <header className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-5 py-3.5">
            <Skeleton shape="text" className="h-3.5 w-40" />
            <Skeleton shape="text" className="mt-1.5 h-3 w-2/3" />
          </header>
          <div className="grid grid-cols-1 gap-5 px-5 py-5 md:grid-cols-2">
            {Array.from({ length: FIELDS_PER_GROUP }).map((_, fieldIndex) => (
              <div key={fieldIndex} className="space-y-1.5">
                <Skeleton shape="text" className="h-3 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </section>
      ))}
      <div className="flex justify-end">
        <Skeleton shape="pill" className="h-10 w-36" />
      </div>
    </div>
  );
}
