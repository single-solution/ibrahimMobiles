import { Suspense } from "react";

import { AdminShell } from "@/components/layout/AdminShell";
import { TeamCatalog } from "@/app/team/_components/TeamCatalog";
import { ListWorkspaceSkeleton } from "@/components/loading/ListWorkspaceSkeleton";
import { adminWorkspacePageClass } from "@/components/shared/adminWorkspaceUi";

import { loadAdminTeamCached } from "@/lib/cached";
import { requirePagePermission } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const { actor } = await requirePagePermission("team_view", "/team");

  return (
    <AdminShell contentClassName={adminWorkspacePageClass}>
      <section className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<ListWorkspaceSkeleton />}>
          <TeamData
            currentUserId={actor.id}
            isCurrentUserSuperAdmin={actor.isSuperAdmin}
          />
        </Suspense>
      </section>
    </AdminShell>
  );
}

interface TeamDataProps {
  currentUserId: string;
  isCurrentUserSuperAdmin: boolean;
}

async function TeamData({ currentUserId, isCurrentUserSuperAdmin }: TeamDataProps) {
  const members = await loadAdminTeamCached();
  return (
    <TeamCatalog
      members={members}
      currentUserId={currentUserId}
      isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
    />
  );
}
