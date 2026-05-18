import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { TeamView } from "@/components/TeamView";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import { connectDB, User } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { toUserResponse, type UserLean } from "@/lib/serializers/user";

export const dynamic = "force-dynamic";

const TEAM_COLUMN_COUNT = 5;
const TEAM_ROW_COUNT = 6;

export default async function AdminTeamPage() {
  const actor = await requirePageSession("/team");

  return (
    <AdminShell>
      <PageTitle
        eyebrow="Team"
        title="Team & roles"
        description="Members of your admin console with their assigned permissions."
      />
      <section className="mt-8">
        <Suspense
          fallback={
            <AdminTableSkeleton
              columnCount={TEAM_COLUMN_COUNT}
              rowCount={TEAM_ROW_COUNT}
              hasFilterBar={false}
            />
          }
        >
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
    <TeamView
      members={members}
      currentUserId={currentUserId}
      isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
    />
  );
}
