import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { SettingsView } from "@/components/admin/SettingsView";

export default function AdminSettingsPage() {
  return (
    <AdminShell>
      <PageTitle eyebrow="Site" title="Settings" />
      <section className="mt-8">
        <SettingsView />
      </section>
    </AdminShell>
  );
}
