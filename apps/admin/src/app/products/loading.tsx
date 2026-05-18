import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

const SUMMARY_CARDS = 3;
const PRODUCT_COLUMN_COUNT = 6;
const PRODUCT_ROW_COUNT = 12;

/**
 * Mirrors `app/products/page.tsx` exactly:
 *
 *   PageTitle (with "Add product" action)
 *   ↳ 3 summary cards in a grid (Models / Variants / Brands)
 *   ↳ ProductsTable
 */
export default function ProductsLoading() {
  return (
    <AdminPageSkeleton
      label="Loading products"
      eyebrowWidthClass="w-14"
      titleWidthClass="w-32"
      hasActions
    >
      <section className="mt-3 grid grid-cols-3 gap-2 md:mt-10 md:gap-5">
        {Array.from({ length: SUMMARY_CARDS }).map((_, index) => (
          <SummaryCardSkeleton key={index} />
        ))}
      </section>

      <section className="mt-3 md:mt-8">
        <AdminTableSkeleton
          columnCount={PRODUCT_COLUMN_COUNT}
          rowCount={PRODUCT_ROW_COUNT}
        />
      </section>
    </AdminPageSkeleton>
  );
}

function SummaryCardSkeleton() {
  return (
    <div className="rounded-[12px] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3 md:rounded-[var(--radius-lg)] md:p-6">
      <Skeleton shape="text" className="h-2.5 w-16 md:h-3 md:w-20" />
      <Skeleton shape="text" className="mt-1.5 h-5 w-12 md:mt-6 md:h-8 md:w-24" />
      <Skeleton shape="text" className="mt-1 h-3 w-3/4 md:mt-4 md:h-3.5" />
    </div>
  );
}
