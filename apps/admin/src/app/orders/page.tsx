import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { OrdersView } from "@/components/OrdersView";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import { connectDB, Order } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { summariseOrder, type OrderLean } from "@/lib/serializers/order";

export const dynamic = "force-dynamic";

const RECENT_ORDERS_LIMIT = 200;
const ORDERS_COLUMN_COUNT = 6;
const ORDERS_ROW_COUNT = 12;

/**
 * Admin orders index.
 *
 * Static-first rendering: the shell, page title, and section wrapper
 * render synchronously on navigation; the `OrdersView` (which does the
 * Mongo round-trip for the 200 most recent orders) streams in via
 * Suspense with a content-shaped fallback. The brief skeleton flash
 * only covers the data, never the chrome.
 */
export default async function AdminOrdersPage() {
  await requirePageSession("/orders");

  return (
    <AdminShell>
      <PageTitle
        eyebrow="Sales"
        title="Orders"
        description="Manage every order placed through the storefront — from pending payment to delivered."
      />
      <section className="mt-8">
        <Suspense
          fallback={
            <AdminTableSkeleton
              columnCount={ORDERS_COLUMN_COUNT}
              rowCount={ORDERS_ROW_COUNT}
            />
          }
        >
          <OrdersData />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function OrdersData() {
  await connectDB();
  const docs = await Order.find()
    .sort({ placedAt: -1 })
    .limit(RECENT_ORDERS_LIMIT)
    .lean<OrderLean[]>();
  const orders = docs.map(summariseOrder);
  return <OrdersView orders={orders} />;
}
