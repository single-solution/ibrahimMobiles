import { AdminShell } from "@/components/AdminShell";
import { AccountSettings } from "@/components/account/AccountSettings";
import { PageTitle } from "@/components/PageTitle";

import { requirePageSession } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  await requirePageSession("/account");

  return (
    <AdminShell>
      <PageTitle
        eyebrow="Account"
        title="Your profile"
        description="Manage your name, email, and admin sign-in password."
      />
      <section>
        <AccountSettings />
      </section>
    </AdminShell>
  );
}
