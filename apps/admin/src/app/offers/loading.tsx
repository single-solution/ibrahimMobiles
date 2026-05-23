import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";

const OFFERS_COLUMN_COUNT = 5;
const OFFERS_ROW_COUNT = 8;

export default function OffersLoading() {
  return (
    <AdminPageSkeleton label="Loading offers">
      <AdminTableSkeleton
        columnCount={OFFERS_COLUMN_COUNT}
        rowCount={OFFERS_ROW_COUNT}
      />
    </AdminPageSkeleton>
  );
}
