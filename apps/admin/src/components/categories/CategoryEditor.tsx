"use client";

/**
 * Drawer-based editor for a single category. Used in both create and
 * edit modes. Right-hand pane is a live preview that updates as the
 * admin types (deferred to avoid stalling input).
 */

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { StoredImage } from "@store/shared";

import { Drawer } from "@/components/Drawer";
import { ImageUpload } from "@/components/uploads";
import { useToast } from "@/components/Toast";
import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { CATEGORY_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import type { AdminCategory, AdminCategoryIconKind } from "@/types/admin";

import { PreviewPanel } from "./previewPanel";
import {
  CategoryCardPreview,
  CategoryHeaderPreview,
  CategoryNavChipPreview,
  categoryToDraft,
  type CategoryDraft,
} from "./previews";

interface CategoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  /** Existing category for edit mode, or `null` to create. */
  category: AdminCategory | null;
  onSaved: () => void;
}

interface FormState {
  label: string;
  description: string;
  iconKind: AdminCategoryIconKind;
  iconEmoji: string;
  iconImage: StoredImage | null;
  isActive: boolean;
  sortOrder: number;
}

function emptyForm(): FormState {
  return {
    label: "",
    description: "",
    iconKind: "emoji",
    iconEmoji: "📦",
    iconImage: null,
    isActive: true,
    sortOrder: 0,
  };
}

function formFromCategory(category: AdminCategory): FormState {
  return {
    label: category.label,
    description: category.description,
    iconKind: category.iconKind,
    iconEmoji: category.iconEmoji ?? "📦",
    iconImage: category.iconImage ?? null,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
  };
}

export function CategoryEditor({
  isOpen,
  onClose,
  category,
  onSaved,
}: CategoryEditorProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() =>
    category ? formFromCategory(category) : emptyForm(),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form on drawer open; the drawer is the external system here
    setForm(category ? formFromCategory(category) : emptyForm());
  }, [isOpen, category]);

  const deferredForm = useDeferredValue(form);
  const draft: CategoryDraft = useMemo(
    () => ({
      label: deferredForm.label,
      description: deferredForm.description,
      iconKind: deferredForm.iconKind,
      iconEmoji: deferredForm.iconEmoji,
      iconImage: deferredForm.iconImage ?? undefined,
      isActive: deferredForm.isActive,
    }),
    [deferredForm],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!form.label.trim()) {
      toast.danger("Label is required.");
      return;
    }
    if (form.iconKind === "emoji" && !form.iconEmoji.trim()) {
      toast.danger("Pick an emoji or switch to image upload.");
      return;
    }
    if (form.iconKind === "image" && !form.iconImage) {
      toast.danger("Upload an icon image or switch back to emoji.");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        label: form.label.trim(),
        description: form.description.trim(),
        iconKind: form.iconKind,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
      };
      if (form.iconKind === "emoji") {
        body.iconEmoji = form.iconEmoji;
      } else if (form.iconImage) {
        body.iconImage = form.iconImage;
      }
      if (category) {
        await adminFetch<AdminCategory>(`/api/categories/${category.id}`, {
          method: "PUT",
          json: body,
        });
        toast.success("Category updated.");
      } else {
        await adminFetch<AdminCategory>("/api/categories", {
          method: "POST",
          json: body,
        });
        toast.success("Category created.");
      }
      onSaved();
      onClose();
    } catch (error) {
      const message =
        error instanceof AdminApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to save category.";
      toast.danger(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={category ? `Edit · ${category.label}` : "New category"}
      description="Define the storefront landing surface and the bucket every brand, grade, and attribute attaches to."
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
            form="category-editor-form"
            disabled={submitting}
            className="rounded-md bg-[var(--color-accent-600)] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-[var(--color-accent-700)] disabled:opacity-60"
          >
            {submitting ? "Saving…" : category ? "Save changes" : "Create category"}
          </button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          id="category-editor-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <Field label="Label" htmlFor="category-label">
            <input
              id="category-label"
              type="text"
              value={form.label}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, label: e.target.value }))
              }
              maxLength={CATEGORY_FIELD_LIMITS.label}
              required
              className="block w-full rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[14px] text-[var(--color-ink-900)] focus:border-[var(--color-accent-500)] focus:outline-none"
            />
          </Field>
          <Field
            label="Description"
            htmlFor="category-description"
            hint={`${form.description.length}/${CATEGORY_FIELD_LIMITS.description}`}
          >
            <textarea
              id="category-description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              maxLength={CATEGORY_FIELD_LIMITS.description}
              rows={3}
              className="block w-full rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[14px] text-[var(--color-ink-900)] focus:border-[var(--color-accent-500)] focus:outline-none"
            />
          </Field>
          <fieldset className="rounded-md border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
              Icon
            </legend>
            <div className="flex flex-wrap gap-2">
              <IconKindToggle
                label="Emoji"
                active={form.iconKind === "emoji"}
                onSelect={() =>
                  setForm((prev) => ({ ...prev, iconKind: "emoji" }))
                }
              />
              <IconKindToggle
                label="Upload image"
                active={form.iconKind === "image"}
                onSelect={() =>
                  setForm((prev) => ({ ...prev, iconKind: "image" }))
                }
              />
            </div>
            {form.iconKind === "emoji" ? (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="text"
                  value={form.iconEmoji}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, iconEmoji: e.target.value.slice(0, 4) }))
                  }
                  maxLength={4}
                  className="w-20 rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-center text-[20px] focus:border-[var(--color-accent-500)] focus:outline-none"
                  aria-label="Category emoji"
                />
                <p className="text-[12px] text-[var(--color-ink-500)]">
                  Pick a single character — e.g. 📱 📦 🎧 🎮.
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <ImageUpload
                  value={form.iconImage}
                  onChange={(image) =>
                    setForm((prev) => ({ ...prev, iconImage: image }))
                  }
                  altSeed={`${form.label || "Category"} icon`}
                  subjectKind="categories"
                  subjectId={form.label || undefined}
                  aspect="square"
                  hint="Square 256×256+ PNG / WebP"
                />
              </div>
            )}
          </fieldset>
          <Field label="Sort order" htmlFor="category-sort-order">
            <input
              id="category-sort-order"
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  sortOrder: Number.isFinite(e.target.valueAsNumber)
                    ? e.target.valueAsNumber
                    : 0,
                }))
              }
              className="block w-32 rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[14px] focus:border-[var(--color-accent-500)] focus:outline-none"
            />
          </Field>
          <label className="flex items-center gap-2 text-[13px] text-[var(--color-ink-800)]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isActive: e.target.checked }))
              }
            />
            Visible to customers
          </label>
        </form>
        <PreviewPanel
          hint="Updates as you type. Shows the three storefront surfaces this category powers."
          tiles={[
            {
              surfaceLabel: "Appears on: Homepage category grid",
              body: <CategoryCardPreview category={draft} />,
            },
            {
              surfaceLabel: "Appears on: Category landing header",
              body: <CategoryHeaderPreview category={draft} />,
            },
            {
              surfaceLabel: "Appears on: Nav menu chip",
              body: <CategoryNavChipPreview category={draft} />,
            },
          ]}
        />
      </div>
    </Drawer>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]"
        >
          {label}
        </label>
        {hint && (
          <span className="text-[10.5px] text-[var(--color-ink-400)]">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function IconKindToggle({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "rounded-md border px-2.5 py-1.5 text-[12.5px] font-semibold transition " +
        (active
          ? "border-[var(--color-accent-500)] bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
          : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]")
      }
    >
      {label}
    </button>
  );
}

export { type CategoryEditorProps };
