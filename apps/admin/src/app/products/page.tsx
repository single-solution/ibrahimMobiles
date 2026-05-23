import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { ProductsCatalog } from "@/components/products/ProductsCatalog";
import { loadProductWizardCatalog } from "@/lib/products/loadProductWizardCatalog";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import { Brand, connectDB, Product } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import {
  brandLookupKey,
  summariseProduct,
  type ProductLean,
} from "@/lib/serializers/product";
import { type BrandLean } from "@/lib/serializers/brand";

export const dynamic = "force-dynamic";

const PRODUCT_COLUMN_COUNT = 6;
const PRODUCT_ROW_COUNT = 12;

/**
 * Admin products index.
 *
 * Static-first rendering: the shell, page title (including the "Add
 * product" CTA), and section wrapper render synchronously. The
 * data-driven products table sits inside its own Suspense boundary so
 * it streams in once the underlying Mongo reads resolve.
 */
export default async function AdminProductsPage() {
  await requirePageSession("/products");
  return (
    <AdminShell contentClassName="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5 md:p-2">
      <section className="flex min-h-0 flex-1 flex-col">
        <Suspense
          fallback={
            <AdminTableSkeleton
              columnCount={PRODUCT_COLUMN_COUNT}
              rowCount={PRODUCT_ROW_COUNT}
            />
          }
        >
          <ProductsTableData />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function ProductsTableData() {
  await connectDB();
  const [productDocs, brandDocs] = await Promise.all([
    Product.find({ isArchived: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean<ProductLean[]>(),
    Brand.find().lean<BrandLean[]>(),
  ]);

  const brandsByCategoryAndSlug = new Map(
    brandDocs.flatMap((brand) =>
      brand.categorySlugs.map(
        (categorySlug) =>
          [brandLookupKey(categorySlug, brand.slug), brand] as const,
      ),
    ),
  );
  const products = productDocs.map((doc) =>
    summariseProduct(doc, brandsByCategoryAndSlug),
  );
  const catalog = await loadProductWizardCatalog();
  return <ProductsCatalog products={products} catalog={catalog} />;
}
