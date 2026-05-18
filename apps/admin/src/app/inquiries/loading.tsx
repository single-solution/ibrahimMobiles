import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";

const INQUIRIES_COLUMN_COUNT = 6;
const INQUIRIES_ROW_COUNT = 12;

export default function InquiriesLoading() {
  return (
    <AdminPageSkeleton
      label="Loading inquiries"
      eyebrowWidthClass="w-20"
      titleWidthClass="w-32"
    >
      <AdminTableSkeleton
        columnCount={INQUIRIES_COLUMN_COUNT}
        rowCount={INQUIRIES_ROW_COUNT}
      />
    </AdminPageSkeleton>
  );
}
