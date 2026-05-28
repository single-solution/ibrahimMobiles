import { Suspense } from "react";

import { AdminShell } from "@/components/layout/AdminShell";
import { CustomersCatalog } from "@/app/customers/_components/CustomersCatalog";
import { SalesWorkspaceSkeleton } from "@/components/loading/SalesWorkspaceSkeleton";
import { adminWorkspacePageClass } from "@/components/shared/adminWorkspaceUi";

import {
  ADMIN_LOYALTY_POINT_TO_RUPEE,
  loadAdminCustomersCached,
} from "@/lib/cached";
import { requirePagePermission } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  await requirePagePermission("customer_view", "/customers");

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
  const customers = await loadAdminCustomersCached();
  return (
    <CustomersCatalog
      customers={customers}
      programmeRupeesPerPoint={ADMIN_LOYALTY_POINT_TO_RUPEE}
    />
  );
}
