import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";

const BRANDS_COLUMN_COUNT = 5;
const BRANDS_ROW_COUNT = 10;

export default function BrandsLoading() {
  return (
    <AdminPageSkeleton
      label="Loading brands"
      eyebrowWidthClass="w-14"
      titleWidthClass="w-32"
    >
      <AdminTableSkeleton
        columnCount={BRANDS_COLUMN_COUNT}
        rowCount={BRANDS_ROW_COUNT}
      />
    </AdminPageSkeleton>
  );
}
