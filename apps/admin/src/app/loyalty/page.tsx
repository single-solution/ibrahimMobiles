import type { Types } from "mongoose";
import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { LoyaltyView } from "@/components/LoyaltyView";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import { connectDB, Customer, LoyaltyAccount } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { toLoyaltyAccountResponse, type LoyaltyAccountLean } from "@/lib/serializers/loyalty";
import { LOYALTY_POINT_TO_RUPEE } from "@store/shared";

export const dynamic = "force-dynamic";

const LOYALTY_ACCOUNTS_LIMIT = 500;
const LOYALTY_COLUMN_COUNT = 6;
const LOYALTY_ROW_COUNT = 12;

export default async function AdminLoyaltyPage() {
  await requirePageSession("/loyalty");

  return (
    <AdminShell>
      <PageTitle
        eyebrow="Sales"
        title="Loyalty"
        description="Members, balances and lifetime value across the Loyalty Points programme."
      />
      <section className="mt-8">
        <Suspense
          fallback={
            <AdminTableSkeleton
              columnCount={LOYALTY_COLUMN_COUNT}
              rowCount={LOYALTY_ROW_COUNT}
            />
          }
        >
          <LoyaltyData />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function LoyaltyData() {
  await connectDB();
  const [accountDocs, customers] = await Promise.all([
    LoyaltyAccount.find()
      .sort({ balance: -1 })
      .limit(LOYALTY_ACCOUNTS_LIMIT)
      .lean<LoyaltyAccountLean[]>(),
    Customer.find().select("_id name").lean<Array<{ _id: Types.ObjectId; name: string }>>(),
  ]);

  const customerNameById = new Map(customers.map((customer) => [customer._id.toString(), customer.name]));
  const accounts = accountDocs.map((doc) =>
    toLoyaltyAccountResponse(doc, customerNameById.get(doc.customerId.toString()) ?? "Unknown"),
  );

  return <LoyaltyView accounts={accounts} programmeRupeesPerPoint={LOYALTY_POINT_TO_RUPEE} />;
}
