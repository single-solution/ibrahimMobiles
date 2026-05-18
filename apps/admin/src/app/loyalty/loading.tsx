import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";

const LOYALTY_COLUMN_COUNT = 6;
const LOYALTY_ROW_COUNT = 12;

export default function LoyaltyLoading() {
  return (
    <AdminPageSkeleton
      label="Loading loyalty programme"
      eyebrowWidthClass="w-12"
      titleWidthClass="w-28"
      hasDescription
    >
      <AdminTableSkeleton
        columnCount={LOYALTY_COLUMN_COUNT}
        rowCount={LOYALTY_ROW_COUNT}
      />
    </AdminPageSkeleton>
  );
}
