import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import { ChevronLeft } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { ProductEditor } from "@/components/ProductEditor";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Brand,
  connectDB,
  Grade,
  Product,
} from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { isValidId } from "@store/shared";
import { toProductResponse, type ProductLean } from "@/lib/serializers/product";
import { toBrandResponse, type BrandLean } from "@/lib/serializers/brand";
import { toGradeResponse, type GradeLean } from "@/lib/serializers/grade";

interface ProductEditPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

const PRODUCT_EDITOR_SECTIONS = 4;
const FIELDS_PER_SECTION = 4;
const VARIANT_ROW_COUNT = 3;

/**
 * Admin product editor.
 *
 * The shell + back link render synchronously. The page title needs
 * the product's brand + model name (eyebrow / title), so it sits
 * inside its own Suspense boundary with a title-skeleton fallback;
 * that streams in independently of the heavyweight editor below.
 *
 * The editor — which loads brands + grades + the product — is the
 * second Suspense slot and streams the moment all three resolve.
 */
export default async function ProductEditPage({ params }: ProductEditPageProps) {
  const { id } = await params;
  await requirePageSession(`/products/${id}`);

  if (!isValidId(id)) {
    notFound();
  }

  return (
    <AdminShell>
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink-500)] transition-colors hover:text-[var(--color-ink-900)]"
      >
        <ChevronLeft size={12} />
        Back to products
      </Link>

      <div className="mt-4">
        <Suspense fallback={<TitleFallback />}>
          <ProductTitle id={id} />
        </Suspense>
      </div>

      <div className="mt-8">
        <Suspense fallback={<EditorFallback />}>
          <EditorData id={id} />
        </Suspense>
      </div>
    </AdminShell>
  );
}

/**
 * Per-render memoised lookups. Both Suspense boundaries below need the
 * product doc and its brand, but they each `await` independently so
 * each section can light up the moment its own slice of data lands.
 * Wrapping the underlying reads in `React.cache(id)` collapses the
 * duplicate Mongo round-trips into a single in-flight promise per id.
 */
const loadProduct = cache(async (id: string) => {
  await connectDB();
  return Product.findById(id).lean<ProductLean>();
});

const loadBrand = cache(async (brandId: string) => {
  await connectDB();
  return Brand.findById(brandId).lean<BrandLean>();
});

async function ProductTitle({ id }: { id: string }) {
  const productDoc = await loadProduct(id);
  if (!productDoc) {
    notFound();
  }
  // Title only needs the *one* brand. We don't wait for the full
  // brands list / grades that the editor also fetches.
  const brand = await loadBrand(productDoc.brandId.toString());
  const product = toProductResponse(productDoc, brand ?? undefined);
  return (
    <PageTitle
      eyebrow={product.brand.name || product.brand.slug}
      title={product.modelName}
      description={`${product.variantCount} variants · ${product.id}`}
    />
  );
}

async function EditorData({ id }: { id: string }) {
  // The full editor needs all brands (for the brand dropdown) and all
  // grades — those are independent of the title's lighter read, so the
  // title can paint as soon as `loadProduct` + `loadBrand(brandId)`
  // come back, while the editor continues to wait on its heavier
  // brand-list / grade-list fetches.
  const productDoc = await loadProduct(id);
  if (!productDoc) {
    notFound();
  }

  const [brandDocs, gradeDocs, productBrand] = await Promise.all([
    (async () => {
      await connectDB();
      return Brand.find().sort({ sortOrder: 1, name: 1 }).lean<BrandLean[]>();
    })(),
    (async () => {
      await connectDB();
      return Grade.find().sort({ sortOrder: 1 }).lean<GradeLean[]>();
    })(),
    loadBrand(productDoc.brandId.toString()),
  ]);

  const product = toProductResponse(productDoc, productBrand ?? undefined);
  const grades = gradeDocs.map(toGradeResponse);
  const brands = brandDocs.map(toBrandResponse);

  return <ProductEditor product={product} brands={brands} grades={grades} />;
}

function TitleFallback() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <Skeleton shape="text" className="h-2.5 w-20" />
        <Skeleton shape="text" className="h-8 w-72" />
        <Skeleton shape="text" className="h-3 w-56" />
      </div>
    </header>
  );
}

function EditorFallback() {
  return (
    <div className="space-y-1 pt-3">
      {Array.from({ length: PRODUCT_EDITOR_SECTIONS }).map((_, index) => (
        <FormSectionFallback key={index} />
      ))}

      <section className="grid gap-6 border-b border-[var(--color-ink-100)] py-6 md:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          <Skeleton shape="text" className="h-4 w-20" />
          <Skeleton shape="text" className="h-3 w-full" />
          <Skeleton shape="text" className="h-3 w-3/4" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: VARIANT_ROW_COUNT }).map((_, index) => (
            <VariantRowFallback key={index} />
          ))}
          <Skeleton shape="pill" className="h-9 w-32" />
        </div>
      </section>
    </div>
  );
}

function FormSectionFallback() {
  return (
    <section className="grid gap-6 border-b border-[var(--color-ink-100)] py-6 md:grid-cols-[260px_1fr]">
      <div className="space-y-2">
        <Skeleton shape="text" className="h-4 w-24" />
        <Skeleton shape="text" className="h-3 w-full" />
        <Skeleton shape="text" className="h-3 w-3/4" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: FIELDS_PER_SECTION }).map((_, index) => (
          <div key={index} className="space-y-1.5">
            <Skeleton shape="text" className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function VariantRowFallback() {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-3">
      <Skeleton className="size-10 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton shape="text" className="h-3.5 w-40" />
        <Skeleton shape="text" className="h-3 w-56" />
      </div>
      <Skeleton shape="text" className="h-3.5 w-20 shrink-0" />
      <Skeleton shape="pill" className="h-8 w-8 shrink-0" />
      <Skeleton shape="pill" className="h-8 w-8 shrink-0" />
    </div>
  );
}
