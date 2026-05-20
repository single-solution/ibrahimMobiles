"use client";

/**
 * Inline editor for an existing product. Mirrors `<CreateProduct>` —
 * progressive sections + sticky preview panel — but operates against a
 * persisted product and supports per-variant CRUD via `<VariantEditor>`.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PreviewPanel } from "@/components/categories/previewPanel";
import { useToast } from "@/components/Toast";
import type {
  AdminAttribute,
  AdminBrand,
  AdminCategory,
  AdminGrade,
  AdminProduct,
  AdminVariant,
} from "@/types/admin";

import { VariantEditor } from "./VariantEditor";

interface ProductEditorProps {
  product: AdminProduct;
  category: AdminCategory | null;
  brands: AdminBrand[];
  grades: AdminGrade[];
  attributes: AdminAttribute[];
}

export function ProductEditor({
  product: initialProduct,
  category,
  brands,
  grades,
  attributes,
}: ProductEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const [product, setProduct] = useState<AdminProduct>(initialProduct);
  const [name, setName] = useState(initialProduct.name);
  const [brandSlug, setBrandSlug] = useState(initialProduct.brand.slug);
  const [isFeatured, setIsFeatured] = useState(initialProduct.isFeatured);
  const [isActive, setIsActive] = useState(initialProduct.isActive);
  const [isArchived, setIsArchived] = useState(initialProduct.isArchived);
  const [savingMeta, setSavingMeta] = useState(false);
  const [editingVariant, setEditingVariant] = useState<{
    mode: "create" | "edit";
    variant?: AdminVariant;
  } | null>(null);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [deleteProduct, setDeleteProduct] = useState(false);

  // Bring the local meta-fields in sync if the server payload changes
  // (after navigating back from a sibling tab, etc.).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror server-provided initial data when the page re-renders with fresh props
    setProduct(initialProduct);
    setName(initialProduct.name);
    setBrandSlug(initialProduct.brand.slug);
    setIsFeatured(initialProduct.isFeatured);
    setIsActive(initialProduct.isActive);
    setIsArchived(initialProduct.isArchived);
  }, [initialProduct]);

  const gradesBySlug = useMemo(
    () => new Map(grades.map((g) => [g.slug, g])),
    [grades],
  );

  const metaDirty =
    name.trim() !== product.name ||
    brandSlug !== product.brand.slug ||
    isFeatured !== product.isFeatured ||
    isActive !== product.isActive ||
    isArchived !== product.isArchived;

  const saveMeta = useCallback(async () => {
    if (savingMeta) return;
    if (!name.trim()) {
      toast.danger("Name is required.");
      return;
    }
    setSavingMeta(true);
    try {
      const updated = await adminFetch<AdminProduct>(
        `/api/products/${product.id}`,
        {
          method: "PUT",
          json: {
            name: name.trim(),
            brandSlug,
            isFeatured,
            isActive,
            isArchived,
          },
        },
      );
      setProduct(updated);
      toast.success("Product saved.");
    } catch (error) {
      const message =
        error instanceof AdminApiError
          ? error.message
          : "Failed to save product.";
      toast.danger(message);
    } finally {
      setSavingMeta(false);
    }
  }, [savingMeta, name, brandSlug, isFeatured, isActive, isArchived, product.id, toast]);

  async function handleVariantSaved(updated: AdminProduct) {
    setProduct(updated);
    setEditingVariant(null);
  }

  async function confirmDeleteVariant() {
    if (!deletingVariantId) return;
    const variantId = deletingVariantId;
    setDeletingVariantId(null);
    try {
      const updated = await adminFetch<AdminProduct>(
        `/api/products/${product.id}/variants/${variantId}`,
        { method: "DELETE" },
      );
      setProduct(updated);
      toast.success("Variant removed.");
    } catch (error) {
      const message =
        error instanceof AdminApiError
          ? error.message
          : "Failed to remove variant.";
      toast.danger(message);
    }
  }

  async function confirmDeleteProduct() {
    setDeleteProduct(false);
    try {
      await adminFetch(`/api/products/${product.id}`, { method: "DELETE" });
      toast.success("Product deleted.");
      router.push("/products");
    } catch (error) {
      const message =
        error instanceof AdminApiError
          ? error.message
          : "Failed to delete product.";
      toast.danger(message);
    }
  }

  return (
    <>
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink-500)] transition-colors hover:text-[var(--color-ink-900)]"
      >
        <ChevronLeft size={12} />
        Back to products
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <Section title="Details">
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                  Name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  className="rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[15px] focus:border-[var(--color-accent-500)] focus:outline-none"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <p className="rounded-md border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-3 py-2 text-[12.5px] text-[var(--color-ink-600)]">
                  <span className="font-semibold uppercase tracking-[0.14em]">
                    Category
                  </span>
                  <br />
                  {category?.label ?? product.categorySlug}{" "}
                  <span className="text-[11px] text-[var(--color-ink-400)]">
                    ({product.categorySlug})
                  </span>
                </p>
                <p className="rounded-md border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-3 py-2 text-[12.5px] text-[var(--color-ink-600)]">
                  <span className="font-semibold uppercase tracking-[0.14em]">
                    Slug
                  </span>
                  <br />
                  /shop/{product.categorySlug}/{product.slug}
                </p>
              </div>
            </div>
          </Section>

          <Section title="Brand">
            {brands.length === 0 ? (
              <p className="text-[12.5px] italic text-[var(--color-ink-500)]">
                No brands are linked to this category. Add one in{" "}
                <Link
                  href="/categories"
                  className="font-semibold text-[var(--color-accent-700)] underline"
                >
                  Categories
                </Link>
                .
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => setBrandSlug(brand.slug)}
                    className={
                      "rounded-full border px-2.5 py-1 text-[13px] font-semibold transition " +
                      (brandSlug === brand.slug
                        ? "border-[var(--color-accent-500)] bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
                        : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]")
                    }
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
            )}
          </Section>

          <Section title="Status">
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--color-ink-800)]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Visible to customers
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                Featured on storefront
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isArchived}
                  onChange={(e) => setIsArchived(e.target.checked)}
                />
                Archived
              </label>
            </div>
          </Section>

          <Section
            title={`Variants · ${product.variants.length}`}
            action={
              <button
                type="button"
                onClick={() => setEditingVariant({ mode: "create" })}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12.5px] font-semibold text-[var(--color-ink-800)] hover:bg-[var(--color-canvas-deep)]"
              >
                <Plus size={12} /> Add variant
              </button>
            }
          >
            {product.variants.length === 0 ? (
              <p className="rounded-md border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-4 text-[12.5px] italic text-[var(--color-ink-500)]">
                No variants yet — add one so customers can buy this product.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {product.variants.map((variant) => (
                  <VariantRow
                    key={variant.id}
                    variant={variant}
                    grade={gradesBySlug.get(variant.gradeSlug)}
                    onEdit={() =>
                      setEditingVariant({ mode: "edit", variant })
                    }
                    onDelete={() => setDeletingVariantId(variant.id)}
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section title="Danger zone">
            <p className="text-[12.5px] text-[var(--color-ink-600)]">
              Deleting a product is blocked if any order references it. Archive
              instead to hide from customers.
            </p>
            <button
              type="button"
              onClick={() => setDeleteProduct(true)}
              className="mt-3 inline-flex items-center gap-1 rounded-md border border-[var(--color-rose-300)] bg-[var(--color-surface)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--color-rose-700)] hover:bg-[var(--color-rose-100)]"
            >
              <Trash2 size={12} /> Delete product
            </button>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <PreviewPanel
            title="Live preview"
            hint="Snapshot of how the product surfaces today. Save changes to recompute."
            tiles={previewTiles(product, category, gradesBySlug)}
          />
        </aside>
      </div>

      {metaDirty && (
        <div className="fixed inset-x-0 bottom-3 z-30 mx-auto flex max-w-3xl items-center justify-end gap-2 rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-4 py-2 shadow-[var(--shadow-md)]">
          <span className="text-[12.5px] font-semibold text-[var(--color-ink-700)]">
            Unsaved changes
          </span>
          <button
            type="button"
            onClick={() => {
              setName(product.name);
              setBrandSlug(product.brand.slug);
              setIsFeatured(product.isFeatured);
              setIsActive(product.isActive);
              setIsArchived(product.isArchived);
            }}
            className="rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={saveMeta}
            disabled={savingMeta}
            className="rounded-md bg-[var(--color-accent-600)] px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[var(--color-accent-700)] disabled:opacity-60"
          >
            {savingMeta ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      <VariantEditor
        isOpen={editingVariant !== null}
        onClose={() => setEditingVariant(null)}
        product={product}
        category={category}
        grades={grades}
        attributes={attributes}
        mode={editingVariant?.mode ?? "create"}
        variant={editingVariant?.variant ?? null}
        onSaved={handleVariantSaved}
      />

      <ConfirmDialog
        isOpen={deletingVariantId !== null}
        title="Remove variant?"
        message="Customers will no longer be able to buy this configuration. This can't be undone."
        confirmLabel="Remove"
        tone="danger"
        onCancel={() => setDeletingVariantId(null)}
        onConfirm={confirmDeleteVariant}
      />

      <ConfirmDialog
        isOpen={deleteProduct}
        title="Delete this product?"
        message="Hard-deletes the product and all its variants. Blocked if any order references it."
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setDeleteProduct(false)}
        onConfirm={confirmDeleteProduct}
      />
    </>
  );
}

function VariantRow({
  variant,
  grade,
  onEdit,
  onDelete,
}: {
  variant: AdminVariant;
  grade?: AdminGrade;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hero = variant.images[0];
  return (
    <li className="flex items-center gap-3 rounded-md border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-2.5">
      <span className="block size-12 shrink-0 overflow-hidden rounded-md bg-[var(--color-canvas-deep)]">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element -- tiny thumbnail, optimizer round-trip not worth it
          <img src={hero.variants.thumb} alt={hero.alt} className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-[10px] italic text-[var(--color-ink-400)]">
            No image
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {grade ? (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white"
              style={{ backgroundColor: grade.color }}
            >
              {grade.label}
            </span>
          ) : (
            <span className="text-[11px] italic text-[var(--color-ink-400)]">
              No grade
            </span>
          )}
          {Object.entries(variant.attributes).map(([slug, value]) => (
            <span
              key={slug}
              className="inline-flex items-center rounded-full bg-[var(--color-ink-100)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-600)]"
            >
              {value}
            </span>
          ))}
        </div>
        <p className="mt-0.5 text-[12px] text-[var(--color-ink-600)]">
          Rs {variant.priceRupees.toLocaleString()} · qty {variant.quantity}
          {variant.warrantyMonths !== undefined &&
            ` · ${variant.warrantyMonths}mo warranty`}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit variant"
        className="rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-1.5 text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
      >
        <Pencil size={13} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Remove variant"
        className="rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-1.5 text-[var(--color-ink-500)] hover:border-[var(--color-rose-300)] hover:bg-[var(--color-rose-100)] hover:text-[var(--color-rose-700)]"
      >
        <Trash2 size={13} />
      </button>
    </li>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function previewTiles(
  product: AdminProduct,
  category: AdminCategory | null,
  gradesBySlug: Map<string, AdminGrade>,
): { surfaceLabel: string; body: React.ReactNode }[] {
  const firstVariant = product.variants[0];
  const grade = firstVariant
    ? gradesBySlug.get(firstVariant.gradeSlug)
    : undefined;
  const hero = firstVariant?.images[0];
  const cardTile = (
    <div className="flex flex-col gap-2 p-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-[var(--color-canvas-deep)]">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview thumbnail; no need for the optimizer round-trip
          <img
            src={hero.variants.card}
            alt={hero.alt}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-[11px] italic text-[var(--color-ink-400)]">
            No image
          </div>
        )}
        {grade && (
          <span
            className="absolute left-2 top-2 inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-white"
            style={{ backgroundColor: grade.color }}
          >
            {grade.label}
          </span>
        )}
      </div>
      <p className="truncate text-[12.5px] font-semibold text-[var(--color-ink-900)]">
        {product.name}
      </p>
      <p className="truncate text-[11px] text-[var(--color-ink-500)]">
        {product.brand.name}
        {firstVariant && ` · Rs ${firstVariant.priceRupees.toLocaleString()}`}
      </p>
    </div>
  );
  if (!firstVariant) {
    return [
      {
        surfaceLabel: "Add a variant to begin",
        body: (
          <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
            <Sparkles
              size={20}
              className="text-[var(--color-accent-600)]"
              aria-hidden
            />
            <p className="text-[12.5px] text-[var(--color-ink-500)]">
              Customers can&rsquo;t see this product until at least one variant
              exists.
            </p>
          </div>
        ),
      },
    ];
  }
  return [
    {
      surfaceLabel: "Appears on: Category listing",
      body: cardTile,
    },
    {
      surfaceLabel: `Appears on: PDP · ${category?.label ?? product.categorySlug}`,
      body: (
        <div className="flex flex-col gap-2 p-3">
          <div className="aspect-[16/10] overflow-hidden rounded-md bg-[var(--color-canvas-deep)]">
            {hero ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview thumbnail; no need for the optimizer round-trip
              <img
                src={hero.variants.detail}
                alt={hero.alt}
                className="size-full object-cover"
              />
            ) : null}
          </div>
          <p className="text-[13px] font-semibold text-[var(--color-ink-900)]">
            {product.name}
          </p>
          <p className="text-[11.5px] text-[var(--color-ink-500)]">
            {product.brand.name} · {category?.label ?? product.categorySlug}
          </p>
        </div>
      ),
    },
  ];
}
