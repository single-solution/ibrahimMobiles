import { Suspense } from "react";

import { AdminShell } from "@/components/layout/AdminShell";
import { Inquiries } from "@/app/inquiries/_components/Inquiries";
import { InquiriesInboxSkeleton } from "@/components/loading/InquiriesInboxSkeleton";
import { adminWorkspacePageClass } from "@/components/shared/adminWorkspaceUi";

import { loadAdminInquiriesCached } from "@/lib/cached";
import { requirePagePermission } from "@/lib/server/requirePageSession";
import type { PermissionKey } from "@/lib/permissionsCatalog";

export const dynamic = "force-dynamic";

export interface InquiriesPageAccess {
  actorId: string;
  actorName: string;
  permissions: PermissionKey[];
}

export default async function AdminInquiriesPage() {
  const { actor, permissions } = await requirePagePermission(
    "inquiry_view",
    "/inquiries",
  );

  const access: InquiriesPageAccess = {
    actorId: actor.id,
    actorName: actor.name,
    permissions,
  };

  return (
    <AdminShell contentClassName={adminWorkspacePageClass}>
      <section className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<InquiriesInboxSkeleton />}>
          <InquiriesData access={access} />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function InquiriesData({ access }: { access: InquiriesPageAccess }) {
  const inquiries = await loadAdminInquiriesCached();
  return <Inquiries inquiries={inquiries} access={access} />;
}
