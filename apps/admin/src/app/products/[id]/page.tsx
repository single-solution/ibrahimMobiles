import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { Brand, connectDB, Product } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { isValidId } from "@store/shared";
import {
  toProductResponse,
  type ProductLean,
} from "@/lib/serializers/product";
import { type BrandLean } from "@/lib/serializers/brand";

interface ProductEditPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Product detail (admin). The full inline editor + variant workspace
 * lands in Phase 5 of PLAN.md — see PHASE 5, "Product editor + variant
 * list refactor". For now, this page renders only the canonical header
 * so the admin sidebar nav into `/products/{id}` resolves cleanly while
 * the data-model migration finishes.
 */
export default async function ProductEditPage({ params }: ProductEditPageProps) {
  const { id } = await params;
  await requirePageSession(`/products/${id}`);

  if (!isValidId(id)) {
    notFound();
  }

  await connectDB();
  const productDoc = await Product.findById(id).lean<ProductLean>();
  if (!productDoc) {
    notFound();
  }

  const brand = await Brand.findOne({ slug: productDoc.brandSlug }).lean<BrandLean>();
  const product = toProductResponse(productDoc, brand ?? undefined);

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
        <PageTitle
          eyebrow={product.brand.name || product.brand.slug}
          title={product.name}
          description={`${product.variantCount} variants · ${product.id}`}
        />
      </div>

      <section className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface)] p-8 text-sm text-[var(--color-ink-500)]">
        <p className="font-semibold text-[var(--color-ink-700)]">
          The inline product editor is being rebuilt (Phase 5).
        </p>
        <p className="mt-2 max-w-prose">
          Variant authoring with the new <code>StoredImage[]</code> pipeline +
          dynamic per-category attributes lands as part of the product
          editor refactor. The schema underneath this page (
          <code>category → brand → grades → attributes → variants</code>) is
          already in place — see PLAN.md §10.
        </p>
      </section>
    </AdminShell>
  );
}
