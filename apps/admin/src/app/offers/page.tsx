import { Suspense } from "react";

import { AdminShell } from "@/components/layout/AdminShell";
import { Offers } from "@/app/offers/_components/Offers";
import { ListWorkspaceSkeleton } from "@/components/loading/ListWorkspaceSkeleton";
import { adminListPageClass } from "@/components/shared/adminWorkspaceUi";

import { loadAdminOffersCached } from "@/lib/cached";
import { requirePagePermission } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

export default async function AdminOffersPage() {
  await requirePagePermission("offer_manage", "/offers");

  return (
    <AdminShell contentClassName={adminListPageClass}>
      <section className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<ListWorkspaceSkeleton />}>
          <OffersData />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function OffersData() {
  const offers = await loadAdminOffersCached();
  return <Offers offers={offers} />;
}
