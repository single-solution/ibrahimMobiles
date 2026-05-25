import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { Inquiries } from "@/components/Inquiries";
import { InquiriesInboxSkeleton } from "@/components/loading/InquiriesInboxSkeleton";
import { adminWorkspacePageClass } from "@/components/workspace/adminWorkspaceUi";
import { connectDB, Inquiry } from "@store/db";

import { requirePagePermission } from "@/lib/server/requirePageSession";
import { summariseInquiry, type InquiryLean } from "@/lib/serializers/inquiry";
import type { PermissionKey } from "@/lib/permissionsCatalog";

export const dynamic = "force-dynamic";

const RECENT_INQUIRIES_LIMIT = 200;

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
  await connectDB();
  const docs = await Inquiry.find()
    .sort({ lastMessageAt: -1 })
    .limit(RECENT_INQUIRIES_LIMIT)
    .lean<InquiryLean[]>();
  const inquiries = docs.map(summariseInquiry);
  return <Inquiries inquiries={inquiries} access={access} />;
}
