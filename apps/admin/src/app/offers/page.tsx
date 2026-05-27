import { Suspense } from "react";

import { AdminShell } from "@/components/layout/AdminShell";
import { Offers } from "@/app/offers/_components/Offers";
import { ListWorkspaceSkeleton } from "@/components/loading/ListWorkspaceSkeleton";
import { adminListPageClass } from "@/components/shared/adminWorkspaceUi";
import { connectDB, Offer } from "@store/db";

import { requirePagePermission } from "@/lib/server/requirePageSession";
import { toOfferResponse, type OfferLean } from "@/lib/serializers/offer";

export const dynamic = "force-dynamic";

const OFFERS_LIST_LIMIT = 200;

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
  await connectDB();
  const docs = await Offer.find()
    .sort({ sortOrder: 1, createdAt: -1 })
    .limit(OFFERS_LIST_LIMIT)
    .lean<OfferLean[]>();
  const offers = docs.map(toOfferResponse);
  return <Offers offers={offers} />;
}
