import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";

const TEAM_COLUMN_COUNT = 5;
const TEAM_ROW_COUNT = 6;

export default function TeamLoading() {
  return (
    <AdminPageSkeleton
      label="Loading team"
      eyebrowWidthClass="w-10"
      titleWidthClass="w-36"
      hasDescription
    >
      <AdminTableSkeleton
        columnCount={TEAM_COLUMN_COUNT}
        rowCount={TEAM_ROW_COUNT}
        hasFilterBar={false}
      />
    </AdminPageSkeleton>
  );
}
