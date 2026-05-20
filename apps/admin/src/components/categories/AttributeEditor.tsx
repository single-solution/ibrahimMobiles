"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { GripVertical, Plus, X } from "lucide-react";

import { Drawer } from "@/components/Drawer";
import { useToast } from "@/components/Toast";
import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { ATTRIBUTE_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import type {
  AdminAttribute,
  AdminAttributeCardPosition,
  AdminAttributeOption,
  AdminCategory,
} from "@/types/admin";

import { PreviewPanel } from "./previewPanel";
import {
  AttributeCardChipPreview,
  AttributeFilterGroupPreview,
  AttributeSpecStripPreview,
  type AttributeDraft,
} from "./previews";

interface AttributeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  attribute: AdminAttribute | null;
  category: AdminCategory;
  onSaved: () => void;
}

const CARD_POSITIONS: { value: AdminAttributeCardPosition; label: string }[] = [
  { value: "image-overlay", label: "Image overlay" },
  { value: "title-chips", label: "Title chip" },
  { value: "none", label: "Hidden on cards" },
];

interface FormState {
  label: string;
  cardPosition: AdminAttributeCardPosition;
  isActive: boolean;
  options: AdminAttributeOption[];
}

function emptyForm(): FormState {
  return {
    label: "",
    cardPosition: "title-chips",
    isActive: true,
    options: [{ value: "", label: "" }],
  };
}

function formFromAttribute(attribute: AdminAttribute): FormState {
  return {
    label: attribute.label,
    cardPosition: attribute.cardPosition,
    isActive: attribute.isActive,
    options: attribute.options.length > 0
      ? attribute.options.map((o) => ({ ...o }))
      : [{ value: "", label: "" }],
  };
}

export function AttributeEditor({
  isOpen,
  onClose,
  attribute,
  category,
  onSaved,
}: AttributeEditorProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() =>
    attribute ? formFromAttribute(attribute) : emptyForm(),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form on drawer open; the drawer is the external system here
    setForm(attribute ? formFromAttribute(attribute) : emptyForm());
  }, [isOpen, attribute]);

  const deferredForm = useDeferredValue(form);
  const draft: AttributeDraft = useMemo(
    () => ({
      label: deferredForm.label,
      cardPosition: deferredForm.cardPosition,
      isActive: deferredForm.isActive,
      options: deferredForm.options.filter((o) => o.label.trim().length > 0),
    }),
    [deferredForm],
  );

  function updateOption(index: number, patch: Partial<AdminAttributeOption>) {
    setForm((prev) => {
      const next = prev.options.slice();
      next[index] = { ...next[index], ...patch };
      return { ...prev, options: next };
    });
  }
  function addOption() {
    setForm((prev) => {
      if (prev.options.length >= ATTRIBUTE_FIELD_LIMITS.optionCount) return prev;
      return {
        ...prev,
        options: [...prev.options, { value: "", label: "" }],
      };
    });
  }
  function removeOption(index: number) {
    setForm((prev) => {
      if (prev.options.length === 1) return prev;
      return {
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
      };
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!form.label.trim()) {
      toast.danger("Label is required.");
      return;
    }
    const cleanedOptions = form.options
      .map((opt) => ({
        value: opt.value.trim(),
        label: opt.label.trim(),
      }))
      .filter((opt) => opt.label.length > 0);
    if (cleanedOptions.length === 0) {
      toast.danger("Add at least one option.");
      return;
    }
    setSubmitting(true);
    try {
      if (attribute) {
        await adminFetch<AdminAttribute>(`/api/attributes/${attribute.id}`, {
          method: "PUT",
          json: {
            label: form.label.trim(),
            options: cleanedOptions,
            cardPosition: form.cardPosition,
            isActive: form.isActive,
          },
        });
        toast.success("Attribute updated.");
      } else {
        await adminFetch<AdminAttribute>("/api/attributes", {
          method: "POST",
          json: {
            categorySlug: category.slug,
            label: form.label.trim(),
            options: cleanedOptions,
            cardPosition: form.cardPosition,
            isActive: form.isActive,
          },
        });
        toast.success("Attribute created.");
      }
      onSaved();
      onClose();
    } catch (error) {
      const message =
        error instanceof AdminApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to save attribute.";
      toast.danger(message);
    } finally {
      setSubmitting(false);
    }
  }

  const previewTiles = useMemo(() => {
    const tiles: { surfaceLabel: string; body: React.ReactNode }[] = [
      {
        surfaceLabel: "Appears on: PDP spec strip",
        body: <AttributeSpecStripPreview attribute={draft} />,
      },
      {
        surfaceLabel: "Appears on: Filter sidebar",
        body: <AttributeFilterGroupPreview attribute={draft} />,
      },
    ];
    if (draft.cardPosition !== "none") {
      tiles.push({
        surfaceLabel:
          draft.cardPosition === "image-overlay"
            ? "Appears on: Product card (image overlay)"
            : "Appears on: Product card (title chip)",
        body: <AttributeCardChipPreview attribute={draft} />,
      });
    }
    return tiles;
  }, [draft]);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={attribute ? `Edit · ${attribute.label}` : `New attribute · ${category.label}`}
      description="Attributes power filters and dynamic specs. Options are single-select per variant."
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
            form="attribute-editor-form"
            disabled={submitting}
            className="rounded-md bg-[var(--color-accent-600)] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-[var(--color-accent-700)] disabled:opacity-60"
          >
            {submitting ? "Saving…" : attribute ? "Save changes" : "Create attribute"}
          </button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          id="attribute-editor-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div>
            <label
              htmlFor="attribute-label"
              className="mb-1 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]"
            >
              Label
            </label>
            <input
              id="attribute-label"
              type="text"
              value={form.label}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, label: e.target.value }))
              }
              maxLength={ATTRIBUTE_FIELD_LIMITS.label}
              required
              className="block w-full rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[14px] focus:border-[var(--color-accent-500)] focus:outline-none"
            />
          </div>
          <div>
            <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]">
              Card surface
            </span>
            <div className="flex flex-wrap gap-2">
              {CARD_POSITIONS.map((position) => (
                <button
                  key={position.value}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, cardPosition: position.value }))
                  }
                  className={
                    "rounded-md border px-2.5 py-1.5 text-[12.5px] font-semibold transition " +
                    (form.cardPosition === position.value
                      ? "border-[var(--color-accent-500)] bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
                      : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]")
                  }
                >
                  {position.label}
                </button>
              ))}
            </div>
          </div>
          <fieldset className="rounded-md border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
              Options
            </legend>
            <ul className="space-y-2">
              {form.options.map((option, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 rounded-md border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-2 py-1.5"
                >
                  <GripVertical
                    size={14}
                    className="shrink-0 text-[var(--color-ink-400)]"
                    aria-hidden
                  />
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) =>
                      updateOption(index, { label: e.target.value })
                    }
                    placeholder="Label (e.g. 128 GB)"
                    maxLength={ATTRIBUTE_FIELD_LIMITS.optionLabel}
                    className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-[13px] focus:border-[var(--color-accent-500)] focus:bg-[var(--color-surface)] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={option.value}
                    onChange={(e) =>
                      updateOption(index, { value: e.target.value })
                    }
                    placeholder="value-slug"
                    maxLength={ATTRIBUTE_FIELD_LIMITS.optionValue}
                    className="w-28 rounded border border-transparent bg-transparent px-2 py-1 text-[12px] text-[var(--color-ink-600)] focus:border-[var(--color-accent-500)] focus:bg-[var(--color-surface)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    aria-label="Remove option"
                    className="rounded p-1 text-[var(--color-ink-500)] hover:bg-[var(--color-rose-100)] hover:text-[var(--color-rose-700)]"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addOption}
              disabled={form.options.length >= ATTRIBUTE_FIELD_LIMITS.optionCount}
              className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12.5px] font-semibold text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)] disabled:opacity-60"
            >
              <Plus size={12} /> Add option
            </button>
          </fieldset>
          <label className="flex items-center gap-2 text-[13px] text-[var(--color-ink-800)]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isActive: e.target.checked }))
              }
            />
            Surface in storefront filters
          </label>
        </form>
        <PreviewPanel tiles={previewTiles} />
      </div>
    </Drawer>
  );
}
