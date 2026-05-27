import { Suspense } from "react";

import { AdminShell } from "@/components/layout/AdminShell";
import { ProductsCatalog } from "@/app/products/_components/ProductsCatalog";
import { loadProductWizardCatalog } from "@/lib/products/loadProductWizardCatalog";
import { CatalogWorkspaceSkeleton } from "@/components/loading/CatalogWorkspaceSkeleton";
import { adminCatalogPageClass } from "@/components/shared/adminWorkspaceUi";
import { Brand, connectDB, Product } from "@store/db";

import { requirePagePermission } from "@/lib/server/requirePageSession";
import {
  brandLookupKey,
  summariseProduct,
  type ProductLean,
} from "@/lib/serializers/product";
import { type BrandLean } from "@/lib/serializers/brand";

export const dynamic = "force-dynamic";

/**
 * Admin products index.
 *
 * Static-first rendering: the shell, page title (including the "Add
 * product" CTA), and section wrapper render synchronously. The
 * data-driven products table sits inside its own Suspense boundary so
 * it streams in once the underlying Mongo reads resolve.
 */
export default async function AdminProductsPage() {
  await requirePagePermission("product_view", "/products");
  return (
    <AdminShell contentClassName={adminCatalogPageClass}>
      <section className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<CatalogWorkspaceSkeleton />}>
          <ProductsCatalogData />
        </Suspense>
      </section>
    </AdminShell>
  );
}

async function ProductsCatalogData() {
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
