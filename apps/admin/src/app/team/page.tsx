import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { Team } from "@/components/Team";
import { ListWorkspaceSkeleton } from "@/components/loading/ListWorkspaceSkeleton";
import { adminListPageClass } from "@/components/workspace/adminWorkspaceUi";
import { connectDB, User } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { toUserResponse, type UserLean } from "@/lib/serializers/user";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const actor = await requirePageSession("/team");

  return (
    <AdminShell contentClassName={adminListPageClass}>
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
  await connectDB();
  const docs = await User.find().sort({ name: 1 }).lean<UserLean[]>();
  const members = docs.map(toUserResponse);
  return (
    <Team
      members={members}
      currentUserId={currentUserId}
      isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
    />
  );
}
