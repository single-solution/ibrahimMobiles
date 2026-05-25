import { AdminShell } from "@/components/AdminShell";
import { AccountSettings } from "@/components/account/AccountSettings";
import { adminListPageClass } from "@/components/workspace/adminWorkspaceUi";

import { requirePageSession } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  await requirePageSession("/account");

  return (
    <AdminShell contentClassName={adminListPageClass}>
      <section className="flex min-h-0 flex-1 flex-col">
        <AccountSettings />
      </section>
    </AdminShell>
  );
}
