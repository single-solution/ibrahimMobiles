import { AdminListPageShell } from "@/components/shared/AdminListPageShell";
import { AccountSettings } from "@/app/account/_components/AccountSettings";

import { requirePageSession } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  await requirePageSession("/account");

  return (
    <AdminListPageShell>
      <AccountSettings />
    </AdminListPageShell>
  );
}
