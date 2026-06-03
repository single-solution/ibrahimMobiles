import { Suspense } from "react";

import { Shell } from "@/components/layout/Shell";
import { OrdersCatalog } from "@/app/orders/_components/OrdersCatalog";
import { SalesWorkspaceSkeleton } from "@/components/loading/SalesWorkspaceSkeleton";
import { adminWorkspacePageClass } from "@/components/shared/workspaceUi";

import { loadAdminOrdersCached } from "@/lib/cached";
import { requirePagePermission } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  await requirePagePermission("order_view", "/orders");

  return (
    <Shell contentClassName={adminWorkspacePageClass}>
      <section className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<SalesWorkspaceSkeleton />}>
          <OrdersData />
        </Suspense>
      </section>
    </Shell>
  );
}

async function OrdersData() {
  const orders = await loadAdminOrdersCached();
  return <OrdersCatalog orders={orders} />;
}
