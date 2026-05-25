import type { Types } from "mongoose";
import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { CustomersCatalog } from "@/components/customers/CustomersCatalog";
import { SalesWorkspaceSkeleton } from "@/components/loading/SalesWorkspaceSkeleton";
import { adminWorkspacePageClass } from "@/components/workspace/adminWorkspaceUi";
import { connectDB, Customer, LoyaltyAccount, Order } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { toCustomerResponse, type CustomerLean } from "@/lib/serializers/customer";
import type { AdminCustomerSummary } from "@/types/admin";
import { LOYALTY_POINT_TO_RUPEE } from "@store/shared";

export const dynamic = "force-dynamic";

const RECENT_CUSTOMERS_LIMIT = 500;

interface OrderStatsRow {
  _id: Types.ObjectId;
  orderCount: number;
  lifetimeSpendRupees: number;
  lastOrderAt: Date;
}

export default async function AdminCustomersPage() {
  await requirePageSession("/customers");

  return (
    <AdminShell contentClassName={adminWorkspacePageClass}>
      <section className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<SalesWorkspaceSkeleton />}>
          <CustomersData />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function CustomersData() {
  await connectDB();
  const docs = await Customer.find()
    .sort({ createdAt: -1 })
    .limit(RECENT_CUSTOMERS_LIMIT)
    .lean<CustomerLean[]>();
  const stats = await Order.aggregate<OrderStatsRow>([
    { $match: { customerId: { $in: docs.map((customer) => customer._id) } } },
    {
      $group: {
        _id: "$customerId",
        orderCount: { $sum: 1 },
        lifetimeSpendRupees: { $sum: "$totals.totalRupees" },
        lastOrderAt: { $max: "$placedAt" },
      },
    },
  ]);
  const statsMap = new Map(
    stats.map((stat) => [
      stat._id.toString(),
      {
        orderCount: stat.orderCount,
        lifetimeSpendRupees: stat.lifetimeSpendRupees,
        lastOrderAt: stat.lastOrderAt,
      },
    ]),
  );

  const loyaltyDocs = await LoyaltyAccount.find({
    customerId: { $in: docs.map((customer) => customer._id) },
  })
    .select({ customerId: 1, balance: 1, lifetimeEarned: 1 })
    .lean<Array<{ customerId: Types.ObjectId; balance: number; lifetimeEarned: number }>>();

  const loyaltyByCustomerId = new Map(
    loyaltyDocs.map((account) => [
      account.customerId.toString(),
      {
        balance: account.balance ?? 0,
        lifetimeEarned: account.lifetimeEarned ?? 0,
      },
    ]),
  );

  const customers: AdminCustomerSummary[] = docs.map((customer) => {
    const stat = statsMap.get(customer._id.toString()) ?? {
      orderCount: 0,
      lifetimeSpendRupees: 0,
      lastOrderAt: undefined,
    };
    const full = toCustomerResponse(customer, stat);
    const loyalty = loyaltyByCustomerId.get(customer._id.toString());
    return {
      id: full.id,
      name: full.name,
      email: full.email,
      phoneNumber: full.phoneNumber,
      city: full.city,
      isLoyaltyMember: full.isLoyaltyMember,
      loyaltyBalance: loyalty?.balance ?? 0,
      loyaltyLifetimeEarned: loyalty?.lifetimeEarned ?? 0,
      orderCount: full.orderCount,
      lifetimeSpendRupees: full.lifetimeSpendRupees,
      lastOrderAt: full.lastOrderAt,
      createdAt: full.createdAt,
      updatedAt: full.updatedAt,
    };
  });

  return (
    <CustomersCatalog
      customers={customers}
      programmeRupeesPerPoint={LOYALTY_POINT_TO_RUPEE}
    />
  );
}
