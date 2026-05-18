import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { OffersView } from "@/components/OffersView";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import { connectDB, Offer } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { toOfferResponse, type OfferLean } from "@/lib/serializers/offer";

export const dynamic = "force-dynamic";

const OFFERS_LIST_LIMIT = 200;
const OFFERS_COLUMN_COUNT = 5;
const OFFERS_ROW_COUNT = 8;

export default async function AdminOffersPage() {
  await requirePageSession("/offers");

  return (
    <AdminShell>
      <PageTitle
        eyebrow="Catalog"
        title="Offers & deals"
        description="Promotions surfaced on the homepage and the dedicated /deals page."
      />
      <section className="mt-8">
        <Suspense
          fallback={
            <AdminTableSkeleton
              columnCount={OFFERS_COLUMN_COUNT}
              rowCount={OFFERS_ROW_COUNT}
            />
          }
        >
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
  return <OffersView offers={offers} />;
}
