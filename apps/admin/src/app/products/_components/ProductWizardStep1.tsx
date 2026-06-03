"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { slugify } from "@store/shared";

import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { ImageGallery } from "@/components/shared/uploads";
import { uploadGalleryImages } from "@/components/shared/uploads/imageStaging";
import type { GalleryImage } from "@/components/shared/uploads/imageStaging";
import type { AdminProduct } from "@/types/models";
import type { ProductWizardCatalog } from "@/lib/products/loadProductWizardCatalog";

import {
  CategoryOptionButton,
  CategoriesEmptyHint,
  WizardEmptyHint,
  WizardFieldError,
  WizardSection,
} from "./productWizardUi";
import {
  collectProductImageErrors,
  emptyDraft,
  errorsByPath,
  validateShellDraft,
  type CategorySurface,
  type ProductDraft,
  type ProductValidationError,
} from "./productFormState";

interface ProductWizardStep1Props {
  onClose: () => void;
  catalog: ProductWizardCatalog;
  onCreated: (product: AdminProduct) => void;
}

export function ProductWizardStep1({
  onClose,
  catalog,
  onCreated,
}: ProductWizardStep1Props) {
  const toast = useToast();
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [errors, setErrors] = useState<ProductValidationError[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const surface: CategorySurface | null = useMemo(() => {
    if (!draft.categorySlug) return null;
    const category = catalog.categories.find((c) => c.slug === draft.categorySlug);
    if (!category) return null;
    return {
      category,
      brands: catalog.brandsByCategory[draft.categorySlug] ?? [],
      grades: catalog.gradesByCategory[draft.categorySlug] ?? [],
      attributes: catalog.attributesByCategory[draft.categorySlug] ?? [],
    };
  }, [draft.categorySlug, catalog]);

  const errorMap = useMemo(() => errorsByPath(errors), [errors]);
  const slugHint = useMemo(
    () => (draft.name ? slugify(draft.name) : ""),
    [draft.name],
  );

  function setCategory(categorySlug: string) {
    if (categorySlug === draft.categorySlug) return;
    setDraft({ ...emptyDraft(), categorySlug });
    setErrors([]);
  }

  function handleClose() {
    if (submitting) return;
    setDraft(emptyDraft());
    setErrors([]);
    onClose();
  }

  function updateImages(images: GalleryImage[]) {
    setDraft((prev) => ({ ...prev, images }));
    setErrors((prev) => prev.filter((row) => row.path !== "images"));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (submitting) return;
    const shell = validateShellDraft(draft);
    const imageErrors = collectProductImageErrors(draft.images);
    if (!shell.ok || imageErrors.length > 0) {
      const merged = [...(shell.ok ? [] : shell.errors), ...imageErrors];
      setErrors(merged);
      toast.danger(
        merged.length === 1
          ? merged[0].message
          : `${merged.length} fields need attention.`,
      );
      return;
    }
    setErrors([]);
    setSubmitting(true);
    try {
      // Photos exist before the product does, so stage them under a draft
      // prefix; storage paths reorganise on the next save once we have an id.
      const uploadedImages = await uploadGalleryImages(draft.images, {
        subjectKind: "products/new",
        subjectId: shell.payload.brandSlug
          ? `${shell.payload.categorySlug}-${shell.payload.brandSlug}-${slugHint || "draft"}`
          : "draft",
      });
      const product = await apiFetch<AdminProduct>("/api/products", {
        method: "POST",
        json: { ...shell.payload, images: uploadedImages, variants: [], isActive: false },
      });
      toast.success("Product saved. Add variations next, or skip for now.");
      setDraft(emptyDraft());
      setErrors([]);
      onCreated(product);
    } catch (error) {
      const message =
        error instanceof ApiError
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
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
        <form id="product-wizard-step1" onSubmit={handleSubmit} className="flex flex-col gap-5">
          <WizardSection title="Category">
            {catalog.categories.length === 0 ? (
              <CategoriesEmptyHint />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {catalog.categories.map((category) => (
                  <CategoryOptionButton
                    key={category.id}
                    category={category}
                    isSelected={draft.categorySlug === category.slug}
                    onSelect={() => setCategory(category.slug)}
                  />
                ))}
              </div>
            )}
            <WizardFieldError message={errorMap.get("categorySlug")} />
          </WizardSection>

          <WizardSection title="Brand">
            {!surface ? (
              <WizardEmptyHint>Select a category first to see available brands.</WizardEmptyHint>
            ) : surface.brands.length === 0 ? (
              <WizardEmptyHint>
                This category has no brands yet. Add one from{" "}
                <Link
                  href="/categories"
                  className="font-semibold text-[var(--color-accent-700)] underline"
                >
                  Categories
                </Link>
                .
              </WizardEmptyHint>
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
            <WizardFieldError message={errorMap.get("brandSlug")} />
          </WizardSection>

          <WizardSection title="Name">
            {!surface ? (
              <WizardEmptyHint>Select a category first.</WizardEmptyHint>
            ) : (
              <>
                <input
                  type="text"
                  required
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, name: e.target.value }))
                  }
                  maxLength={120}
                  placeholder="Product name"
                  className="block w-full rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[15px] focus:border-[var(--color-accent-500)] focus:outline-none"
                />
                {slugHint && (
                  <p className="mt-1 text-[11.5px] text-[var(--color-ink-500)]">
                    Storefront URL:{" "}
                    <code>
                      /shop/{draft.categorySlug}/{slugHint}
                    </code>
                  </p>
                )}
              </>
            )}
            <WizardFieldError message={errorMap.get("name")} />
          </WizardSection>

          <WizardSection title="Photos">
            {!surface ? (
              <WizardEmptyHint>Select a category first.</WizardEmptyHint>
            ) : (
              <>
                <p className="mb-2 text-[11.5px] text-[var(--color-ink-500)]">
                  One gallery for the whole product — shared by every variant.
                </p>
                <ImageGallery
                  value={draft.images}
                  onChange={updateImages}
                  altTextBase={draft.name || "Product"}
                  subjectKind="products/new"
                  subjectId={slugHint || "draft"}
                  maxImages={8}
                  compact
                  dense
                />
              </>
            )}
            <WizardFieldError message={errorMap.get("images")} />
          </WizardSection>
        </form>
      </div>

      <div className="safe-bottom shrink-0 border-t border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-3 md:px-5 md:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium text-[var(--color-ink-500)]">
            Step 1 of 2
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="product-wizard-step1"
              isLoading={submitting}
            >
              Save &amp; continue
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
