import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";

const CATEGORIES_COLUMN_COUNT = 4;
const CATEGORIES_ROW_COUNT = 6;
const GRADES_COLUMN_COUNT = 4;
const GRADES_ROW_COUNT = 6;

export default function CategoriesLoading() {
  return (
    <AdminPageSkeleton
      label="Loading categories"
      eyebrowWidthClass="w-14"
      titleWidthClass="w-36"
      hasDescription
    >
      <div className="space-y-6">
        <AdminTableSkeleton
          columnCount={CATEGORIES_COLUMN_COUNT}
          rowCount={CATEGORIES_ROW_COUNT}
          hasFilterBar={false}
        />
        <AdminTableSkeleton
          columnCount={GRADES_COLUMN_COUNT}
          rowCount={GRADES_ROW_COUNT}
          hasFilterBar={false}
        />
      </div>
    </AdminPageSkeleton>
  );
}
