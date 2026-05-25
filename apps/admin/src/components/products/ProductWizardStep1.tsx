"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { slugify } from "@store/shared";

import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/Drawer";
import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { useToast } from "@/components/Toast";
import type { AdminProduct } from "@/types/admin";
import type { ProductWizardCatalog } from "@/lib/products/loadProductWizardCatalog";

import {
  CategoryOptionButton,
  CategoriesEmptyHint,
  WizardEmptyHint,
  WizardFieldError,
  WizardSection,
} from "./productWizardUi";
import {
  emptyDraft,
  errorsByPath,
  validateShellDraft,
  type CategorySurface,
  type ProductDraft,
  type ProductValidationError,
} from "./productFormState";

interface ProductWizardStep1Props {
  isOpen: boolean;
  onClose: () => void;
  catalog: ProductWizardCatalog;
  onCreated: (product: AdminProduct) => void;
}

export function ProductWizardStep1({
  isOpen,
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const result = validateShellDraft(draft);
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
      const product = await adminFetch<AdminProduct>("/api/products", {
        method: "POST",
        json: { ...result.payload, variants: [] },
      });
      toast.success("Product saved. Add variations next, or skip for now.");
      setDraft(emptyDraft());
      setErrors([]);
      onCreated(product);
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
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title="New product"
      description="Step 1 of 2 — pick category, brand, and name. Variations come next."
      width="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
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
      }
    >
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

        {surface && (
          <>
            <WizardSection title="Brand">
              {surface.brands.length === 0 ? (
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
              <input
                type="text"
                value={draft.name}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                maxLength={120}
                placeholder="Samsung Galaxy S24 Ultra"
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
              <WizardFieldError message={errorMap.get("name")} />
            </WizardSection>
          </>
        )}
      </form>
    </Drawer>
  );
}
