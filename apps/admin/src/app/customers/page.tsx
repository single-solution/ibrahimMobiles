import type { Types } from "mongoose";
import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { CustomersView } from "@/components/CustomersView";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import { connectDB, Customer, Order } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { toCustomerResponse, type CustomerLean } from "@/lib/serializers/customer";
import type { AdminCustomerSummary } from "@/types/admin";

export const dynamic = "force-dynamic";

const RECENT_CUSTOMERS_LIMIT = 500;
const CUSTOMERS_COLUMN_COUNT = 7;
const CUSTOMERS_ROW_COUNT = 12;

interface OrderStatsRow {
  _id: Types.ObjectId;
  orderCount: number;
  lifetimeSpendRupees: number;
  lastOrderAt: Date;
}

export default async function AdminCustomersPage() {
  await requirePageSession("/customers");

  return (
    <AdminShell>
      <PageTitle
        eyebrow="Sales"
        title="Customers"
        description="Buyers and walk-in inquiries that you've added or that have placed an order."
      />
      <section className="mt-8">
        <Suspense
          fallback={
            <AdminTableSkeleton
              columnCount={CUSTOMERS_COLUMN_COUNT}
              rowCount={CUSTOMERS_ROW_COUNT}
            />
          }
        >
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

  const customers: AdminCustomerSummary[] = docs.map((customer) => {
    const stat = statsMap.get(customer._id.toString()) ?? {
      orderCount: 0,
      lifetimeSpendRupees: 0,
      lastOrderAt: undefined,
    };
    const full = toCustomerResponse(customer, stat);
    return {
      id: full.id,
      name: full.name,
      email: full.email,
      phoneNumber: full.phoneNumber,
      city: full.city,
      isLoyaltyMember: full.isLoyaltyMember,
      orderCount: full.orderCount,
      lifetimeSpendRupees: full.lifetimeSpendRupees,
      lastOrderAt: full.lastOrderAt,
      createdAt: full.createdAt,
      updatedAt: full.updatedAt,
    };
  });

  return <CustomersView customers={customers} />;
}
