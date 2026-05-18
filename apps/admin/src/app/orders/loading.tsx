import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";

const ORDERS_COLUMN_COUNT = 6;
const ORDERS_ROW_COUNT = 12;

export default function OrdersLoading() {
  return (
    <AdminPageSkeleton
      label="Loading orders"
      eyebrowWidthClass="w-12"
      titleWidthClass="w-28"
      hasDescription
    >
      <AdminTableSkeleton
        columnCount={ORDERS_COLUMN_COUNT}
        rowCount={ORDERS_ROW_COUNT}
      />
    </AdminPageSkeleton>
  );
}
