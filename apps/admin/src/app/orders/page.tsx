import { Suspense } from "react";

import { AdminShell } from "@/components/layout/AdminShell";
import { OrdersCatalog } from "@/app/orders/_components/OrdersCatalog";
import { SalesWorkspaceSkeleton } from "@/components/loading/SalesWorkspaceSkeleton";
import { adminWorkspacePageClass } from "@/components/shared/adminWorkspaceUi";
import { connectDB, Order } from "@store/db";

import { requirePagePermission } from "@/lib/server/requirePageSession";
import { summariseOrder, type OrderLean } from "@/lib/serializers/order";

export const dynamic = "force-dynamic";

const RECENT_ORDERS_LIMIT = 200;

export default async function AdminOrdersPage() {
  await requirePagePermission("order_view", "/orders");

  return (
    <AdminShell contentClassName={adminWorkspacePageClass}>
      <section className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<SalesWorkspaceSkeleton />}>
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
  return <OrdersCatalog orders={orders} />;
}
