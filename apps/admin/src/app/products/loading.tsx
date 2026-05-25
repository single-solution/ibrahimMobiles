import { AdminPageSkeleton } from "@/components/loading/AdminPageSkeleton";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";

const PRODUCT_COLUMN_COUNT = 6;
const PRODUCT_ROW_COUNT = 12;

/**
 * Mirrors `app/products/page.tsx` exactly:
 *
 *   ↳ ProductsCatalog workspace
 */
export default function ProductsLoading() {
  return (
    <AdminPageSkeleton
      label="Loading products"
      hasActions
    >
      <section className="mt-3 md:mt-8">
        <AdminTableSkeleton
          columnCount={PRODUCT_COLUMN_COUNT}
          rowCount={PRODUCT_ROW_COUNT}
        />
      </section>
    </AdminPageSkeleton>
  );
}
