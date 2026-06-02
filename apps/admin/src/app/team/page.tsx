import { Suspense } from "react";

import { AdminListPageShell } from "@/components/shared/AdminListPageShell";
import { TeamCatalog } from "@/app/team/_components/TeamCatalog";
import { ListWorkspaceSkeleton } from "@/components/loading/ListWorkspaceSkeleton";

import { loadAdminTeamCached } from "@/lib/cached";
import { requirePagePermission } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const { actor } = await requirePagePermission("team_view", "/team");

  return (
    <AdminListPageShell>
      <Suspense fallback={<ListWorkspaceSkeleton />}>
        <TeamData
          currentUserId={actor.id}
          isCurrentUserSuperAdmin={actor.isSuperAdmin}
        />
      </Suspense>
    </AdminListPageShell>
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
