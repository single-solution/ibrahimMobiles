"use client";

/**
 * Drawer-based per-variant editor. Used in both `create` and `edit`
 * modes from the product editor. Saves call the existing variant
 * routes (POST `/api/products/<id>/variants`, PUT `.../<variantId>`).
 */

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { StoredImage } from "@store/shared";

import { Drawer } from "@/components/Drawer";
import { PreviewPanel } from "@/components/categories/previewPanel";
import { useToast } from "@/components/Toast";
import { adminFetch, AdminApiError } from "@/lib/adminApi";
import type {
  AdminAttribute,
  AdminCategory,
  AdminGrade,
  AdminProduct,
  AdminVariant,
} from "@/types/admin";

import { VariantCard } from "./VariantCard";
import {
  emptyVariantDraft,
  errorsByPath,
  type VariantDraft,
  type ProductValidationError,
} from "./productFormState";

interface VariantEditorProps {
  isOpen: boolean;
  onClose: () => void;
  product: AdminProduct;
  category: AdminCategory | null;
  grades: AdminGrade[];
  attributes: AdminAttribute[];
  mode: "create" | "edit";
  variant: AdminVariant | null;
  onSaved: (product: AdminProduct) => void;
}

function variantToDraft(variant: AdminVariant): VariantDraft {
  return {
    uid: variant.id,
    gradeSlug: variant.gradeSlug,
    priceRupees: variant.priceRupees,
    quantity: variant.quantity,
    warrantyMonths: variant.warrantyMonths ?? null,
    images: variant.images,
    attributes: { ...variant.attributes },
  };
}

export function VariantEditor({
  isOpen,
  onClose,
  product,
  category,
  grades,
  attributes,
  mode,
  variant,
  onSaved,
}: VariantEditorProps) {
  const toast = useToast();
  const [draft, setDraft] = useState<VariantDraft>(() =>
    variant ? variantToDraft(variant) : emptyVariantDraft(),
  );
  const [errors, setErrors] = useState<ProductValidationError[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form on drawer open; the drawer is the external system here
    setDraft(variant ? variantToDraft(variant) : emptyVariantDraft());
    setErrors([]);
  }, [isOpen, variant]);

  const deferredDraft = useDeferredValue(draft);
  const errorMap = useMemo(() => errorsByPath(errors), [errors]);
  const activeAttributes = useMemo(
    () => attributes.filter((attr) => attr.isActive),
    [attributes],
  );

  function validate(current: VariantDraft): ProductValidationError[] {
    const local: ProductValidationError[] = [];
    if (!current.gradeSlug) {
      local.push({ path: "variants.0.gradeSlug", message: "Pick a grade." });
    }
    if (current.images.length === 0) {
      local.push({
        path: "variants.0.images",
        message: "Add at least one image.",
      });
    }
    if (!Number.isInteger(current.priceRupees) || current.priceRupees < 0) {
      local.push({
        path: "variants.0.priceRupees",
        message: "Price must be a non-negative whole number.",
      });
    }
    if (!Number.isInteger(current.quantity) || current.quantity < 0) {
      local.push({
        path: "variants.0.quantity",
        message: "Quantity must be a non-negative whole number.",
      });
    }
    if (
      current.warrantyMonths !== null &&
      (!Number.isInteger(current.warrantyMonths) || current.warrantyMonths < 0)
    ) {
      local.push({
        path: "variants.0.warrantyMonths",
        message: "Warranty months must be a non-negative whole number.",
      });
    }
    for (const attr of activeAttributes) {
      if (!current.attributes[attr.slug]) {
        local.push({
          path: `variants.0.attributes.${attr.slug}`,
          message: `Select a ${attr.label.toLowerCase()}.`,
        });
      }
    }
    return local;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const localErrors = validate(draft);
    if (localErrors.length > 0) {
      setErrors(localErrors);
      toast.danger(
        localErrors.length === 1
          ? localErrors[0].message
          : `${localErrors.length} fields need attention.`,
      );
      return;
    }
    setErrors([]);
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      gradeSlug: draft.gradeSlug,
      priceRupees: draft.priceRupees,
      quantity: draft.quantity,
      images: draft.images,
      attributes: draft.attributes,
    };
    if (draft.warrantyMonths !== null) {
      payload.warrantyMonths = draft.warrantyMonths;
    }
    try {
      const updated =
        mode === "edit" && variant
          ? await adminFetch<AdminProduct>(
              `/api/products/${product.id}/variants/${variant.id}`,
              { method: "PUT", json: payload },
            )
          : await adminFetch<AdminProduct>(
              `/api/products/${product.id}/variants`,
              { method: "POST", json: payload },
            );
      toast.success(mode === "edit" ? "Variant saved." : "Variant added.");
      onSaved(updated);
    } catch (error) {
      const message =
        error instanceof AdminApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to save variant.";
      toast.danger(message);
    } finally {
      setSubmitting(false);
    }
  }

  const grade = grades.find((g) => g.slug === deferredDraft.gradeSlug);
  const hero = deferredDraft.images[0];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "edit" ? "Edit variant" : "Add variant"}
      description={`${product.name} · ${category?.label ?? product.categorySlug}`}
      width="xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-ink-800)] hover:bg-[var(--color-canvas-deep)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="variant-editor-form"
            disabled={submitting}
            className="rounded-md bg-[var(--color-accent-600)] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-[var(--color-accent-700)] disabled:opacity-60"
          >
            {submitting
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Add variant"}
          </button>
        </div>
      }
    >
      <form
        id="variant-editor-form"
        onSubmit={handleSubmit}
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"
      >
        <VariantCard
          index={0}
          variant={draft}
          grades={grades}
          attributes={activeAttributes}
          errorByPath={errorMap}
          productNameForAlt={product.name}
          onChange={setDraft}
          onRemove={() => {
            /* removal happens from the parent variant list */
          }}
        />
        <PreviewPanel
          tiles={[
            {
              surfaceLabel: "Appears on: Variant chip strip",
              body: (
                <div className="flex flex-wrap gap-1.5 p-3">
                  <span
                    className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11.5px] font-semibold"
                    style={
                      grade
                        ? {
                            borderColor: grade.color,
                            color: grade.color,
                            backgroundColor: `${grade.color}15`,
                          }
                        : undefined
                    }
                  >
                    {grade?.label ?? "Select a grade"}
                  </span>
                  {Object.entries(deferredDraft.attributes).map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center rounded-full bg-[var(--color-ink-100)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-ink-700)]"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              ),
            },
            {
              surfaceLabel: "Appears on: PDP gallery thumb strip",
              body: <ThumbStripPreview images={deferredDraft.images} />,
            },
            {
              surfaceLabel: "Appears on: Lightbox zoom",
              body: <LightboxPreview hero={hero ?? null} />,
            },
          ]}
        />
      </form>
    </Drawer>
  );
}

function ThumbStripPreview({ images }: { images: StoredImage[] }) {
  if (images.length === 0) {
    return (
      <p className="p-3 text-[11.5px] italic text-[var(--color-ink-400)]">
        Upload an image to see the thumb strip.
      </p>
    );
  }
  return (
    <div className="flex gap-1.5 overflow-x-auto p-3">
      {images.slice(0, 8).map((image, index) => (
        <span
          key={`${image.variants.thumb}-${index}`}
          className="block size-14 shrink-0 overflow-hidden rounded-md border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- variant thumb preview */}
          <img
            src={image.variants.thumb}
            alt={image.alt}
            className="size-full object-cover"
          />
        </span>
      ))}
    </div>
  );
}

function LightboxPreview({ hero }: { hero: StoredImage | null }) {
  if (!hero) {
    return (
      <p className="p-3 text-[11.5px] italic text-[var(--color-ink-400)]">
        Upload an image to see the zoomed view.
      </p>
    );
  }
  return (
    <div className="bg-[var(--color-ink-900)] p-3">
      <div className="aspect-[4/3] overflow-hidden rounded-md">
        {/* eslint-disable-next-line @next/next/no-img-element -- lightbox preview */}
        <img
          src={hero.variants.full}
          alt={hero.alt}
          className="size-full object-contain"
        />
      </div>
    </div>
  );
}
