"use client";

/**
 * Drawer-based per-variant editor. Used in both `create` and `edit`
 * modes from the product editor. Saves call the existing variant
 * routes (POST `/api/products/<id>/variants`, PUT `.../<variantId>`).
 */

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { coloredPillStyle } from "@store/shared";

import { Button } from "@store/ui";
import { Drawer } from "@/components/ui/Drawer";
import { PreviewPanel } from "@/app/categories/_components/previewPanel";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  AdminAttribute,
  AdminCategory,
  AdminGrade,
  AdminProduct,
  AdminVariant,
} from "@/types/models";

import { VariantCard } from "./VariantCard";
import {
  adminVariantToDraft,
  emptyVariantDraft,
  errorsByPath,
  mergeVariantDraftAttributes,
  validateVariantDrafts,
  type VariantDraft,
  type ProductValidationError,
  type CategorySurface,
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
    variant ? adminVariantToDraft(variant) : emptyVariantDraft(),
  );
  const [errors, setErrors] = useState<ProductValidationError[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form on drawer open; the drawer is the external system here
    setDraft(variant ? adminVariantToDraft(variant) : emptyVariantDraft());
    setErrors([]);
  }, [isOpen, variant]);

  const deferredDraft = useDeferredValue(draft);
  const errorMap = useMemo(() => errorsByPath(errors), [errors]);
  const surface: CategorySurface | null = category
    ? {
        category,
        brands: [],
        grades,
        attributes,
      }
    : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!surface) {
      toast.danger("Category context is missing.");
      return;
    }
    const validation = validateVariantDrafts(
      [draft],
      surface,
      product.brand.slug,
      () => "variants.0",
    );
    if (!validation.ok) {
      const localErrors = validation.errors;
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
    try {
      const payload: Record<string, unknown> = {
        gradeSlug: draft.gradeSlug,
        priceRupees: draft.priceRupees,
        quantity: draft.quantity,
        attributes: mergeVariantDraftAttributes(draft),
      };
      if (draft.warrantyDays !== null) {
        payload.warrantyDays = draft.warrantyDays;
      }
      if (draft.attributeDisplay && Object.keys(draft.attributeDisplay).length > 0) {
        payload.attributeDisplay = draft.attributeDisplay;
      }
      const updated =
        mode === "edit" && variant
          ? await apiFetch<AdminProduct>(
              `/api/products/${product.id}/variants/${variant.id}`,
              { method: "PUT", json: payload },
            )
          : await apiFetch<AdminProduct>(
              `/api/products/${product.id}/variants`,
              { method: "POST", json: payload },
            );
      toast.success(mode === "edit" ? "Variant saved." : "Variant added.");
      onSaved(updated);
    } catch (error) {
      const message =
        error instanceof ApiError
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

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "edit" ? "Edit variant" : "Add variant"}
      description={`${product.name} · ${category?.label ?? product.categorySlug}`}
      width="xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            form="variant-editor-form"
            isLoading={submitting}
          >
            {mode === "edit" ? "Save changes" : "Add variant"}
          </Button>
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
          attributes={attributes}
          brandSlug={product.brand.slug}
          errorByPath={errorMap}
          allowMultiAttributeSelect
          onChange={(next) => {
            setDraft(next);
            setErrors((prev) =>
              prev.filter((row) => !row.path.startsWith("variants.0")),
            );
          }}
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
                        ? coloredPillStyle(grade.color)
                        : undefined
                    }
                  >
                    {grade?.label ?? "Select a grade"}
                  </span>
                  {Object.entries(deferredDraft.attributes).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center rounded-full bg-[var(--color-ink-100)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-ink-700)]"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </form>
    </Drawer>
  );
}
