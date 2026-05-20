"use client";

/**
 * Single-page progressive form for `/products/new`. Driven entirely by
 * the per-category `CategorySurface` data — picking a category swaps in
 * its brands, grades, and attributes. Variants are added inline.
 *
 * The live preview pane (T4.8) lands once the shared storefront-visual
 * extraction (T3.1) is done; today the right column shows a lightweight
 * summary so the admin always sees the product taking shape.
 */

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { slugify } from "@store/shared";

import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { useToast } from "@/components/Toast";
import { PreviewPanel } from "@/components/categories/previewPanel";
import type {
  AdminAttribute,
  AdminBrand,
  AdminCategory,
  AdminGrade,
  AdminProduct,
} from "@/types/admin";

import { VariantCard } from "./VariantCard";
import {
  emptyDraft,
  emptyVariantDraft,
  errorsByPath,
  validateDraft,
  type CategorySurface,
  type ProductDraft,
  type ProductValidationError,
  type VariantDraft,
} from "./productFormState";

interface CreateProductProps {
  categories: AdminCategory[];
  brandsByCategory: Record<string, AdminBrand[]>;
  gradesByCategory: Record<string, AdminGrade[]>;
  attributesByCategory: Record<string, AdminAttribute[]>;
}

export function CreateProduct({
  categories,
  brandsByCategory,
  gradesByCategory,
  attributesByCategory,
}: CreateProductProps) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [errors, setErrors] = useState<ProductValidationError[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const deferredDraft = useDeferredValue(draft);

  const surface: CategorySurface | null = useMemo(() => {
    if (!draft.categorySlug) return null;
    const category = categories.find((c) => c.slug === draft.categorySlug);
    if (!category) return null;
    return {
      category,
      brands: brandsByCategory[draft.categorySlug] ?? [],
      grades: gradesByCategory[draft.categorySlug] ?? [],
      attributes: (attributesByCategory[draft.categorySlug] ?? []).filter(
        (attr) => attr.isActive,
      ),
    };
  }, [
    draft.categorySlug,
    categories,
    brandsByCategory,
    gradesByCategory,
    attributesByCategory,
  ]);

  const errorMap = useMemo(() => errorsByPath(errors), [errors]);
  const slugHint = useMemo(
    () => (draft.name ? slugify(draft.name) : ""),
    [draft.name],
  );

  function setCategory(categorySlug: string) {
    if (categorySlug === draft.categorySlug) return;
    setDraft({
      ...emptyDraft(),
      categorySlug,
    });
    setErrors([]);
  }

  function updateVariant(uid: string, next: VariantDraft) {
    setDraft((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => (v.uid === uid ? next : v)),
    }));
  }
  function removeVariant(uid: string) {
    setDraft((prev) => ({
      ...prev,
      variants: prev.variants.filter((v) => v.uid !== uid),
    }));
  }
  function addVariant() {
    setDraft((prev) => ({
      ...prev,
      variants: [...prev.variants, emptyVariantDraft()],
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const result = validateDraft(draft, surface);
    if (!result.ok) {
      setErrors(result.errors);
      toast.danger(
        result.errors.length === 1
          ? result.errors[0].message
          : `${result.errors.length} fields need attention.`,
      );
      return;
    }
    setErrors([]);
    setSubmitting(true);
    try {
      const created = await adminFetch<AdminProduct>("/api/products", {
        method: "POST",
        json: result.payload,
      });
      toast.success("Product created.");
      router.push(`/products/${created.id}`);
    } catch (error) {
      const message =
        error instanceof AdminApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to create product.";
      toast.danger(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="flex flex-col gap-6">
        <Section title="Category">
          {categories.length === 0 ? (
            <EmptyHint>
              No categories yet — head to{" "}
              <Link
                href="/categories"
                className="font-semibold text-[var(--color-accent-700)] underline"
              >
                Categories
              </Link>{" "}
              to create one before adding products.
            </EmptyHint>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategory(category.slug)}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] font-semibold transition " +
                    (draft.categorySlug === category.slug
                      ? "border-[var(--color-accent-500)] bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
                      : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]")
                  }
                >
                  <span aria-hidden>{category.iconEmoji || "📦"}</span>
                  {category.label}
                </button>
              ))}
            </div>
          )}
          <FieldErrorLine message={errorMap.get("categorySlug")} />
        </Section>

        {surface && (
          <>
            <Section title="Brand">
              {surface.brands.length === 0 ? (
                <EmptyHint>
                  This category has no brands yet. Add one from the{" "}
                  <Link
                    href="/categories"
                    className="font-semibold text-[var(--color-accent-700)] underline"
                  >
                    Categories workspace
                  </Link>
                  .
                </EmptyHint>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {surface.brands.map((brand) => (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, brandSlug: brand.slug }))
                      }
                      className={
                        "rounded-full border px-2.5 py-1 text-[13px] font-semibold transition " +
                        (draft.brandSlug === brand.slug
                          ? "border-[var(--color-accent-500)] bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
                          : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]")
                      }
                    >
                      {brand.name}
                    </button>
                  ))}
                </div>
              )}
              <FieldErrorLine message={errorMap.get("brandSlug")} />
            </Section>

            <Section title="Name">
              <input
                type="text"
                value={draft.name}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                maxLength={120}
                placeholder="iPhone 13 Pro Max"
                className="block w-full rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[15px] focus:border-[var(--color-accent-500)] focus:outline-none"
              />
              {slugHint && (
                <p className="mt-1 text-[11.5px] text-[var(--color-ink-500)]">
                  Storefront URL: <code>/shop/{draft.categorySlug}/{slugHint}</code>
                </p>
              )}
              <FieldErrorLine message={errorMap.get("name")} />
            </Section>

            <div className="flex flex-wrap items-center gap-4 rounded-md border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2">
              <label className="flex items-center gap-2 text-[13px] text-[var(--color-ink-800)]">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                />
                Visible to customers
              </label>
              <label className="flex items-center gap-2 text-[13px] text-[var(--color-ink-800)]">
                <input
                  type="checkbox"
                  checked={draft.isFeatured}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      isFeatured: e.target.checked,
                    }))
                  }
                />
                Featured on storefront
              </label>
            </div>

            <Section
              title="Variants"
              action={
                <button
                  type="button"
                  onClick={addVariant}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12.5px] font-semibold text-[var(--color-ink-800)] hover:bg-[var(--color-canvas-deep)]"
                >
                  <Plus size={12} /> Add variant
                </button>
              }
            >
              {draft.variants.length === 0 ? (
                <EmptyHint>
                  Every product needs at least one variant — that&rsquo;s where
                  grade, images, attributes, price, and stock live.
                </EmptyHint>
              ) : (
                <div className="flex flex-col gap-3">
                  {draft.variants.map((variant, index) => (
                    <VariantCard
                      key={variant.uid}
                      index={index}
                      variant={variant}
                      grades={surface.grades}
                      attributes={surface.attributes}
                      productNameForAlt={draft.name}
                      errorByPath={errorMap}
                      onChange={(next) => updateVariant(variant.uid, next)}
                      onRemove={() => removeVariant(variant.uid)}
                    />
                  ))}
                </div>
              )}
              <FieldErrorLine message={errorMap.get("variants")} />
            </Section>

            <footer className="sticky bottom-3 z-10 flex items-center justify-end gap-2 rounded-md border border-[var(--color-ink-100)] bg-[var(--color-surface)]/95 p-3 backdrop-blur">
              <Link
                href="/products"
                className="rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-[var(--color-accent-600)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--color-accent-700)] disabled:opacity-60"
              >
                {submitting ? "Creating…" : "Create product"}
              </button>
            </footer>
          </>
        )}
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <PreviewPanel
          title="Live preview"
          hint="Snapshot of how this product will surface. Updates as you fill the form."
          tiles={previewTiles(deferredDraft, surface)}
        />
      </aside>
    </form>
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

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] px-3 py-3 text-[12.5px] text-[var(--color-ink-500)]">
      {children}
    </p>
  );
}

function FieldErrorLine({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-2 text-[12px] font-semibold text-[var(--color-rose-700)]">
      {message}
    </p>
  );
}

function previewTiles(
  draft: ProductDraft,
  surface: CategorySurface | null,
): { surfaceLabel: string; body: React.ReactNode }[] {
  const firstVariant = draft.variants[0];
  const grade = firstVariant
    ? surface?.grades.find((g) => g.slug === firstVariant.gradeSlug)
    : undefined;
  const heroImage = firstVariant?.images[0];
  const brand = surface?.brands.find((b) => b.slug === draft.brandSlug);

  const cardTile = (
    <div className="flex flex-col gap-2 p-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-[var(--color-canvas-deep)]">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview thumbnail; no need for the optimizer round-trip
          <img
            src={heroImage.variants.card}
            alt={heroImage.alt}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-[11px] italic text-[var(--color-ink-400)]">
            Variant hero
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
        {draft.name || "Product name"}
      </p>
      <p className="truncate text-[11px] text-[var(--color-ink-500)]">
        {brand?.name || "Brand"}
        {firstVariant
          ? ` · Rs ${firstVariant.priceRupees.toLocaleString()}`
          : ""}
      </p>
    </div>
  );

  const pdpTile = (
    <div className="flex flex-col gap-2 p-3">
      <div className="aspect-[16/10] overflow-hidden rounded-md bg-[var(--color-canvas-deep)]">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview thumbnail; no need for the optimizer round-trip
          <img
            src={heroImage.variants.detail}
            alt={heroImage.alt}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-[11px] italic text-[var(--color-ink-400)]">
            PDP hero
          </div>
        )}
      </div>
      <p className="text-[13px] font-semibold text-[var(--color-ink-900)]">
        {draft.name || "Product name"}
      </p>
      <p className="text-[11.5px] text-[var(--color-ink-500)]">
        {brand?.name || "Brand"} · {surface?.category.label || "Category"}
      </p>
      <div className="flex flex-wrap gap-1">
        {draft.variants.length === 0 && (
          <span className="text-[11px] italic text-[var(--color-ink-400)]">
            Add variants to populate the chip strip.
          </span>
        )}
        {draft.variants.slice(0, 4).map((variant) => {
          const g = surface?.grades.find((x) => x.slug === variant.gradeSlug);
          return (
            <span
              key={variant.uid}
              className="inline-flex items-center rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--color-ink-800)]"
              style={
                g
                  ? {
                      borderColor: g.color,
                      color: g.color,
                    }
                  : undefined
              }
            >
              {g?.label || "Grade"}
            </span>
          );
        })}
      </div>
    </div>
  );

  if (!surface) {
    return [
      {
        surfaceLabel: "Pick a category to begin",
        body: (
          <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
            <Sparkles
              size={20}
              className="text-[var(--color-accent-600)]"
              aria-hidden
            />
            <p className="text-[12.5px] text-[var(--color-ink-500)]">
              Brands, grades, and attribute pickers light up once a category is
              selected.
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
      surfaceLabel: "Appears on: PDP hero",
      body: pdpTile,
    },
  ];
}
