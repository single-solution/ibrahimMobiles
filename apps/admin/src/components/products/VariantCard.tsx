"use client";

import { Trash2, GripVertical } from "lucide-react";

import { ImageGallery } from "@/components/uploads";
import type { AdminAttribute, AdminGrade } from "@/types/admin";

import type { VariantDraft } from "./productFormState";

interface VariantCardProps {
  index: number;
  variant: VariantDraft;
  grades: AdminGrade[];
  attributes: AdminAttribute[];
  errorByPath: Map<string, string>;
  productNameForAlt: string;
  onChange: (next: VariantDraft) => void;
  onRemove: () => void;
}

export function VariantCard({
  index,
  variant,
  grades,
  attributes,
  errorByPath,
  productNameForAlt,
  onChange,
  onRemove,
}: VariantCardProps) {
  const prefix = `variants.${index}`;
  function fieldError(field: string) {
    return errorByPath.get(`${prefix}.${field}`);
  }
  function attrError(slug: string) {
    return errorByPath.get(`${prefix}.attributes.${slug}`);
  }

  const grade = grades.find((g) => g.slug === variant.gradeSlug);

  return (
    <article className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GripVertical
            size={14}
            className="text-[var(--color-ink-400)]"
            aria-hidden
          />
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-700)]">
            Variant {index + 1}
            {grade && (
              <span
                className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white"
                style={{ backgroundColor: grade.color }}
              >
                {grade.label}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove variant"
          className="rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-1.5 text-[var(--color-ink-500)] transition hover:border-[var(--color-rose-300)] hover:bg-[var(--color-rose-100)] hover:text-[var(--color-rose-700)]"
        >
          <Trash2 size={14} />
        </button>
      </header>

      <div>
        <SubLabel>Grade</SubLabel>
        <div className="flex flex-wrap gap-1.5">
          {grades.length === 0 && (
            <p className="text-[12px] italic text-[var(--color-ink-400)]">
              Define grades for this category first.
            </p>
          )}
          {grades.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onChange({ ...variant, gradeSlug: g.slug })}
              className={
                "rounded-full border px-2.5 py-1 text-[12.5px] font-semibold transition " +
                (variant.gradeSlug === g.slug
                  ? "border-transparent text-white"
                  : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]")
              }
              style={
                variant.gradeSlug === g.slug
                  ? { backgroundColor: g.color }
                  : undefined
              }
            >
              {g.label}
            </button>
          ))}
        </div>
        <FieldError message={fieldError("gradeSlug")} />
      </div>

      <div>
        <SubLabel>Images</SubLabel>
        <ImageGallery
          value={variant.images}
          onChange={(images) => onChange({ ...variant, images })}
          altSeed={`${productNameForAlt || "Product"} variant ${index + 1}`}
          subjectKind="products/new"
          subjectId={variant.uid}
          maxImages={8}
        />
        <FieldError message={fieldError("images")} />
      </div>

      {attributes.length > 0 && (
        <div>
          <SubLabel>Attributes</SubLabel>
          <div className="space-y-2">
            {attributes.map((attr) => (
              <div key={attr.id}>
                <p className="text-[11px] font-semibold text-[var(--color-ink-700)]">
                  {attr.label}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {attr.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...variant,
                          attributes: {
                            ...variant.attributes,
                            [attr.slug]: option.value,
                          },
                        })
                      }
                      className={
                        "rounded-full border px-2.5 py-1 text-[12px] font-medium transition " +
                        (variant.attributes[attr.slug] === option.value
                          ? "border-[var(--color-accent-500)] bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
                          : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]")
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <FieldError message={attrError(attr.slug)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <NumberField
          label="Price (Rs)"
          value={variant.priceRupees}
          min={0}
          onChange={(value) => onChange({ ...variant, priceRupees: value })}
          error={fieldError("priceRupees")}
        />
        <NumberField
          label="Quantity"
          value={variant.quantity}
          min={0}
          onChange={(value) => onChange({ ...variant, quantity: value })}
          error={fieldError("quantity")}
        />
        <NumberField
          label="Warranty (months)"
          value={variant.warrantyMonths ?? 0}
          min={0}
          onChange={(value) => onChange({ ...variant, warrantyMonths: value })}
          error={fieldError("warrantyMonths")}
        />
      </div>
    </article>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
      {children}
    </p>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-[11.5px] font-semibold text-[var(--color-rose-700)]">
      {message}
    </p>
  );
}

function NumberField({
  label,
  value,
  min,
  onChange,
  error,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => {
          const parsed = e.target.valueAsNumber;
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
        className="rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-[14px] focus:border-[var(--color-accent-500)] focus:outline-none"
      />
      <FieldError message={error} />
    </label>
  );
}
