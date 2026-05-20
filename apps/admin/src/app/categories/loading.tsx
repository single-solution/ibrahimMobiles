import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CategoriesLoading() {
  return (
    <AdminPageSkeleton
      label="Loading categories"
      eyebrowWidthClass="w-14"
      titleWidthClass="w-36"
      hasDescription
    >
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface-muted)] px-6 py-10">
        <div className="mx-auto max-w-prose space-y-2">
          <Skeleton shape="text" className="h-3.5 w-full" />
          <Skeleton shape="text" className="h-3.5 w-5/6" />
          <Skeleton shape="text" className="h-3.5 w-3/4" />
        </div>
      </div>
    </AdminPageSkeleton>
  );
}
