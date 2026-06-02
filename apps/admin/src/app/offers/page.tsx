import { Suspense } from "react";

import { AdminListPageShell } from "@/components/shared/AdminListPageShell";
import { Offers } from "@/app/offers/_components/Offers";
import { ListWorkspaceSkeleton } from "@/components/loading/ListWorkspaceSkeleton";

import { loadAdminOffersCached } from "@/lib/cached";
import { requirePagePermission } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

export default async function AdminOffersPage() {
  await requirePagePermission("offer_manage", "/offers");

  return (
    <AdminListPageShell>
      <Suspense fallback={<ListWorkspaceSkeleton />}>
        <OffersData />
      </Suspense>
    </AdminListPageShell>
  );
}

async function OffersData() {
  const offers = await loadAdminOffersCached();
  return <Offers offers={offers} />;
}
