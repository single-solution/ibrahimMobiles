import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { TeamView } from "@/components/admin/TeamView";
import { ROLE_PERMISSIONS, teamMembers } from "@/data/admin/adminTeam";

export default function AdminTeamPage() {
  return (
    <AdminShell>
      <PageTitle eyebrow="Team" title="Team & roles" />
      <section className="mt-8">
        <TeamView members={teamMembers} permissions={ROLE_PERMISSIONS} />
      </section>
    </AdminShell>
  );
}
