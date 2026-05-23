import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import { AdminShell } from "@/components/AdminShell";

export default function CategoriesLoading() {
  return (
    <AdminShell contentClassName="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5 md:p-2">
      <section className="flex min-h-0 flex-1 flex-col">
        <AdminTableSkeleton columnCount={4} rowCount={10} />
      </section>
    </AdminShell>
  );
}
