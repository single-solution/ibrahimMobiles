import { Plus } from "lucide-react";
import { Suspense, cache } from "react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { ButtonLink } from "@/components/ui/Button";
import { ProductsTable } from "@/components/ProductsTable";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";
import { Brand, connectDB, Product } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { summariseProduct, type ProductLean } from "@/lib/serializers/product";
import { type BrandLean } from "@/lib/serializers/brand";

export const dynamic = "force-dynamic";

const SUMMARY_CARD_COUNT = 3;
const PRODUCT_COLUMN_COUNT = 6;
const PRODUCT_ROW_COUNT = 12;

/**
 * Admin products index.
 *
 * Static-first rendering: the shell, page title (including the "Add
 * product" CTA), and section wrappers render synchronously. The two
 * data-driven slots — the 3-up summary card grid and the products
 * table — each have their own Suspense boundary so they stream in
 * independently as the underlying Mongo reads resolve.
 *
 * The summary cards and table both need the products list, so they
 * share one async helper (`loadProducts`) wrapped with `React.cache`
 * to dedupe the round-trip within a single render.
 */
export default async function AdminProductsPage() {
  await requirePageSession("/products");

  return (
    <AdminShell>
      <PageTitle
        eyebrow="Catalog"
        title="Products"
        actions={
          <ButtonLink
            href="/products/new"
            variant="primary"
            size="md"
            leadingIcon={<Plus size={15} />}
          >
            Add product
          </ButtonLink>
        }
      />

      <section className="mt-3 grid grid-cols-3 gap-2 md:mt-10 md:gap-5">
        <Suspense fallback={<SummaryCardsFallback />}>
          <ProductsSummary />
        </Suspense>
      </section>

      <section className="mt-3 md:mt-8">
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

/**
 * Loads the products + brands bundle once per render.
 *
 * Both the summary section and the table need the same data. Rather
 * than fetching twice (or threading the data through a shared parent
 * — which would force the page to wait for it before painting), we
 * memoise the read on the React render so each consumer awaits the
 * same in-flight promise.
 */
const loadProductsBundle = cache(async () => {
  await connectDB();
  const [productDocs, brandDocs] = await Promise.all([
    Product.find({ isArchived: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean<ProductLean[]>(),
    Brand.find().lean<BrandLean[]>(),
  ]);

  const brandsById = new Map(brandDocs.map((brand) => [brand._id.toString(), brand]));
  const products = productDocs.map((doc) => summariseProduct(doc, brandsById));
  return { products, brandDocs };
});

async function ProductsSummary() {
  const { products, brandDocs } = await loadProductsBundle();
  const totalVariants = products.reduce((sum, product) => sum + product.variantCount, 0);
  const inStockCount = products.reduce((sum, product) => sum + product.inStockCount, 0);
  const featuredCount = products.filter((product) => product.isFeatured).length;
  return (
    <>
      <SummaryCard label="Models" value={products.length} sub={`${featuredCount} featured`} />
      <SummaryCard
        label="Variants"
        value={totalVariants}
        sub={`${inStockCount} in stock`}
      />
      <SummaryCard label="Brands" value={brandDocs.length} sub="across the catalog" />
    </>
  );
}

async function ProductsTableData() {
  const { products } = await loadProductsBundle();
  return <ProductsTable products={products} />;
}

interface SummaryCardProps {
  label: string;
  value: number;
  sub: string;
}

function SummaryCard({ label, value, sub }: SummaryCardProps) {
  return (
    <div className="rounded-[12px] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3 md:rounded-[var(--radius-lg)] md:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)] md:text-[11px]">
        {label}
      </p>
      <p className="mt-1.5 text-[16px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)] md:mt-6 md:text-[30px] md:leading-none md:tracking-[-0.025em]">
        {value}
      </p>
      <p className="mt-1 line-clamp-1 text-[10.5px] text-[var(--color-ink-500)] md:mt-4 md:text-xs">
        {sub}
      </p>
    </div>
  );
}

function SummaryCardsFallback() {
  return (
    <>
      {Array.from({ length: SUMMARY_CARD_COUNT }).map((_, index) => (
        <div
          key={index}
          className="rounded-[12px] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3 md:rounded-[var(--radius-lg)] md:p-6"
        >
          <Skeleton shape="text" className="h-2.5 w-16 md:h-3 md:w-20" />
          <Skeleton shape="text" className="mt-1.5 h-5 w-12 md:mt-6 md:h-8 md:w-24" />
          <Skeleton shape="text" className="mt-1 h-3 w-3/4 md:mt-4 md:h-3.5" />
        </div>
      ))}
    </>
  );
}
