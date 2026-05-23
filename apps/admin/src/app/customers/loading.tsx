import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";

const CUSTOMERS_COLUMN_COUNT = 7;
const CUSTOMERS_ROW_COUNT = 12;

export default function CustomersLoading() {
  return (
    <AdminPageSkeleton label="Loading customers">
      <AdminTableSkeleton
        columnCount={CUSTOMERS_COLUMN_COUNT}
        rowCount={CUSTOMERS_ROW_COUNT}
      />
    </AdminPageSkeleton>
  );
}
