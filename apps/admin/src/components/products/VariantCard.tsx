"use client";

import { useMemo, useRef, useState } from "react";
import { Trash2, GripVertical } from "lucide-react";
import { classNames, formatWarrantyPeriod } from "@store/shared";
import {
  coloredPillStyle,
  compactAttributeOptionValue,
  compareAlphabetically,
  formatAttributeOptionLabel,
  isVisibilitySatisfied,
  sortAttributeOptions,
  sortAttributesByVisibility,
} from "@store/shared";
import { ColoredPill } from "@/components/ColoredPill";

import type { AdminAttribute, AdminGrade } from "@/types/admin";

import {
  AttributeOptionTabRow,
  ATTRIBUTE_DIMENSION_LABEL_CLASS,
} from "./attributeOptionTabRow";
import {
  attributeValuesOnDraft,
  visibilityAttributesFromDraft,
  type VariantDraft,
} from "./productFormState";

interface VariantCardProps {
  index: number;
  variant: VariantDraft;
  grades: AdminGrade[];
  attributes: AdminAttribute[];
  brandSlug: string;
  errorByPath: Map<string, string>;
  productNameForAlt?: string;
  onChange: (next: VariantDraft) => void;
  onRemove: () => void;
  /** When set, grade is fixed and the grade picker is hidden. */
  lockGradeSlug?: string;
  errorPathPrefix?: string;
  /** Lets admins pick multiple global options per attribute (wizard combinations). */
  allowMultiAttributeSelect?: boolean;
  /** Flat layout inside a master–detail pane (no card chrome). */
  embedded?: boolean;
}

export function VariantCard({
  index,
  variant,
  grades,
  attributes,
  brandSlug,
  errorByPath,
  onChange,
  onRemove,
  lockGradeSlug,
  errorPathPrefix,
  allowMultiAttributeSelect = false,
  embedded = false,
}: VariantCardProps) {
  const prefix = errorPathPrefix ?? `variants.${index}`;
  function fieldError(field: string) {
    return errorByPath.get(`${prefix}.${field}`);
  }
  function attrError(slug: string) {
    return errorByPath.get(`${prefix}.attributes.${slug}`);
  }

  const grade = grades.find((g) => g.slug === variant.gradeSlug);

  const visibleAttributes = useMemo(() => {
    const nodes = attributes.map((attribute) => ({
      slug: attribute.slug,
      label: attribute.label,
      visibility: attribute.visibility ?? { type: "always" as const },
    }));
    const sorted = sortAttributesByVisibility(nodes);
    return sorted
      .map((node) => attributes.find((row) => row.slug === node.slug))
      .filter((row): row is AdminAttribute => {
        if (!row) {
          return false;
        }
        return isVisibilitySatisfied(row.visibility, {
          brandSlug: brandSlug.trim().toLowerCase(),
          gradeSlug: variant.gradeSlug,
          attributes: visibilityAttributesFromDraft(variant),
        });
      });
  }, [attributes, brandSlug, variant.gradeSlug, variant.attributes]);

  return (
    <article
      className={
        embedded
          ? "flex flex-col gap-3"
          : "flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]"
      }
    >
      {!embedded && (
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GripVertical
              size={14}
              className="text-[var(--color-ink-400)]"
              aria-hidden
            />
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-700)]">
              {lockGradeSlug ? "Combination" : "Variant"} {index + 1}
              {grade && (
                <ColoredPill
                  backgroundColor={grade.color}
                  className="ml-2 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
                >
                  {grade.label}
                </ColoredPill>
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
      )}

      {!lockGradeSlug && (
        <div>
          <SubLabel>Grade</SubLabel>
          <div className="flex flex-wrap gap-1.5">
            {grades.length === 0 && (
              <p className="text-[12px] italic text-[var(--color-ink-400)]">
                Define grades for this category first.
              </p>
            )}
            {[...grades]
              .sort((left, right) => compareAlphabetically(left.label, right.label))
              .map((g) => {
                const isSelected = variant.gradeSlug === g.slug;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onChange({ ...variant, gradeSlug: g.slug })}
                    className={
                      "rounded-full border px-2.5 py-1 text-[12.5px] font-semibold transition " +
                      (isSelected
                        ? "border-transparent"
                        : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]")
                    }
                    style={isSelected ? coloredPillStyle(g.color) : undefined}
                  >
                    {g.label}
                  </button>
                );
              })}
          </div>
          <FieldError message={fieldError("gradeSlug")} />
        </div>
      )}

      {visibleAttributes.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
          <div className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/55 px-2.5 py-2">
            <p className="text-[13px] font-semibold tracking-tight text-[var(--color-ink-900)]">
              Attributes
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--color-ink-500)]">
              {allowMultiAttributeSelect
                ? "Select every value this variant covers (e.g. White and Black on one SKU)."
                : "Pick a template option or Custom for a product-only value."}
            </p>
          </div>
          <div className="divide-y divide-[var(--color-ink-100)]">
            {visibleAttributes.map((attr) => (
              <AttributeValuePicker
                key={attr.id}
                attribute={attr}
                variant={variant}
                error={attrError(attr.slug)}
                onChange={onChange}
                allowMultiSelect={allowMultiAttributeSelect}
              />
            ))}
          </div>
        </div>
      )}

      {!embedded && (
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
          <WarrantyDaysField
            value={variant.warrantyDays ?? 0}
            onChange={(value) => onChange({ ...variant, warrantyDays: value })}
            error={fieldError("warrantyDays")}
          />
        </div>
      )}
    </article>
  );
}

interface VariantDetailFooterProps {
  variant: VariantDraft;
  errorPathPrefix: string;
  errorByPath: Map<string, string>;
  onChange: (next: VariantDraft) => void;
  onRemove: () => void;
}

export function VariantDetailFooter({
  variant,
  errorPathPrefix,
  errorByPath,
  onChange,
  onRemove,
}: VariantDetailFooterProps) {
  const lastQuantityRef = useRef(1);
  const inStock = variant.quantity > 0;

  function fieldError(field: string) {
    return errorByPath.get(`${errorPathPrefix}.${field}`);
  }

  function setInStock(next: boolean) {
    if (next) {
      onChange({
        ...variant,
        quantity: lastQuantityRef.current > 0 ? lastQuantityRef.current : 1,
      });
      return;
    }
    if (variant.quantity > 0) {
      lastQuantityRef.current = variant.quantity;
    }
    onChange({ ...variant, quantity: 0 });
  }

  return (
    <footer className="shrink-0 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-3 py-2.5">
      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
        <NumberField
          label="Price (Rs)"
          value={variant.priceRupees}
          min={0}
          compact
          onChange={(value) => onChange({ ...variant, priceRupees: value })}
          error={fieldError("priceRupees")}
        />
        <NumberField
          label="Quantity"
          value={variant.quantity}
          min={0}
          compact
          disabled={!inStock}
          onChange={(value) => {
            if (value > 0) {
              lastQuantityRef.current = value;
            }
            onChange({ ...variant, quantity: value });
          }}
          error={fieldError("quantity")}
        />
        <WarrantyDaysField
          value={variant.warrantyDays ?? 0}
          compact
          onChange={(value) => onChange({ ...variant, warrantyDays: value })}
          error={fieldError("warrantyDays")}
        />
        <label className="flex h-8 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(event) => setInStock(event.target.checked)}
            className="sr-only"
          />
          <span
            aria-hidden
            className={classNames(
              "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
              inStock
                ? "bg-[var(--color-accent-700)]"
                : "bg-[var(--color-ink-200)]",
            )}
          >
            <span
              className={classNames(
                "absolute size-3 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform",
                inStock ? "translate-x-3.5" : "translate-x-0.5",
              )}
            />
          </span>
          <span className="whitespace-nowrap text-[11px] font-semibold text-[var(--color-ink-700)]">
            In stock
          </span>
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-rose-200)] px-2.5 text-[11px] font-semibold text-[var(--color-rose-700)] hover:bg-[var(--color-rose-50)]"
        >
          <Trash2 size={13} aria-hidden />
          Remove
        </button>
      </div>
    </footer>
  );
}

function AttributeValuePicker({
  attribute,
  variant,
  error,
  onChange,
  allowMultiSelect = false,
}: {
  attribute: AdminAttribute;
  variant: VariantDraft;
  error?: string;
  onChange: (next: VariantDraft) => void;
  allowMultiSelect?: boolean;
}) {
  const unit = attribute.unit?.trim() ?? "";
  const selectedValues = attributeValuesOnDraft(variant, attribute.slug);
  const hasMulti = allowMultiSelect && selectedValues.length > 0;
  const selectedValue = hasMulti ? undefined : variant.attributes[attribute.slug];
  const globalValues = new Set(attribute.options.map((option) => option.value));
  const isCustom =
    Boolean(selectedValue) &&
    !globalValues.has(selectedValue as string);
  const [customOpen, setCustomOpen] = useState(isCustom);
  const [customLabel, setCustomLabel] = useState(
    isCustom ? variant.attributeDisplay?.[attribute.slug] ?? "" : "",
  );

  function toggleMultiValue(value: string) {
    const current = variant.attributesMulti?.[attribute.slug] ?? [];
    const nextSet = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];
    const nextMulti = { ...(variant.attributesMulti ?? {}) };
    const nextAttributes = { ...variant.attributes };
    const nextDisplay = { ...(variant.attributeDisplay ?? {}) };
    delete nextAttributes[attribute.slug];
    delete nextDisplay[attribute.slug];
    if (nextSet.length === 0) {
      delete nextMulti[attribute.slug];
    } else {
      nextMulti[attribute.slug] = nextSet;
    }
    onChange({
      ...variant,
      attributes: nextAttributes,
      attributeDisplay: nextDisplay,
      attributesMulti: nextMulti,
    });
    setCustomOpen(false);
  }

  function selectGlobal(value: string) {
    if (allowMultiSelect) {
      toggleMultiValue(value);
      return;
    }
    const nextDisplay = { ...(variant.attributeDisplay ?? {}) };
    delete nextDisplay[attribute.slug];
    const nextMulti = { ...(variant.attributesMulti ?? {}) };
    delete nextMulti[attribute.slug];
    onChange({
      ...variant,
      attributes: { ...variant.attributes, [attribute.slug]: value },
      attributeDisplay: nextDisplay,
      attributesMulti: nextMulti,
    });
    setCustomOpen(false);
  }

  function applyCustomLabel(label: string) {
    const trimmed = label.trim();
    if (!trimmed) {
      const nextAttributes = { ...variant.attributes };
      delete nextAttributes[attribute.slug];
      const nextDisplay = { ...(variant.attributeDisplay ?? {}) };
      delete nextDisplay[attribute.slug];
      onChange({
        ...variant,
        attributes: nextAttributes,
        attributeDisplay: nextDisplay,
      });
      return;
    }
    const slug = compactAttributeOptionValue(trimmed, unit);
    onChange({
      ...variant,
      attributes: { ...variant.attributes, [attribute.slug]: slug },
      attributeDisplay: {
        ...(variant.attributeDisplay ?? {}),
        [attribute.slug]: trimmed,
      },
    });
  }

  const tabOptions = sortAttributeOptions(attribute.options, attribute.unit).map(
    (option) => ({
      key: option.value,
      label: formatAttributeOptionLabel(option.label, attribute.unit),
    }),
  );

  const selectedKeys = allowMultiSelect
    ? selectedValues
    : selectedValue && !isCustom
      ? [selectedValue]
      : [];

  return (
    <div className="flex flex-col gap-1.5 px-2.5 py-2 md:px-3 md:py-2.5">
      <span className={ATTRIBUTE_DIMENSION_LABEL_CLASS}>
        {attribute.label}
        {allowMultiSelect ? " (multi)" : ""}
      </span>
      <AttributeOptionTabRow
        ariaLabel={attribute.label}
        options={tabOptions}
        selectedKeys={selectedKeys}
        onSelect={(key) => selectGlobal(key)}
        trailingOption={
          !allowMultiSelect
            ? {
                key: "__custom",
                label: "Custom",
                isSelected: isCustom || customOpen,
                onSelect: () => setCustomOpen((open) => !open),
              }
            : undefined
        }
      />
      {hasMulti && selectedValues.length > 1 && (
        <p className="mt-1 text-[10.5px] text-[var(--color-ink-500)]">
          {selectedValues.length} values on this variant (shown together on the shop).
        </p>
      )}
      {!allowMultiSelect && (customOpen || isCustom) && (
        <div className="mt-2 flex flex-col gap-1">
          <input
            type="text"
            value={customLabel}
            onChange={(event) => {
              const next = event.target.value;
              setCustomLabel(next);
              applyCustomLabel(next);
            }}
            placeholder="Product-only value (not added to global options)"
            className="rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[13px] focus:border-[var(--color-accent-500)] focus:outline-none"
          />
          {selectedValue && isCustom && (
            <p className="text-[10.5px] text-[var(--color-ink-500)]">
              Slug{" "}
              <code className="rounded bg-[var(--color-canvas-deep)] px-1 font-mono text-[10px]">
                {selectedValue}
              </code>
            </p>
          )}
        </div>
      )}
      <FieldError message={error} />
    </div>
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

function WarrantyDaysField({
  value,
  onChange,
  error,
  compact = false,
}: {
  value: number;
  onChange: (value: number) => void;
  error?: string;
  compact?: boolean;
}) {
  const summary =
    value > 0 ? formatWarrantyPeriod(value) : "No warranty period";

  const labelClass = classNames(
    "whitespace-nowrap font-semibold uppercase text-[var(--color-ink-500)]",
    compact
      ? "text-[10px] tracking-[0.12em]"
      : "text-[11px] tracking-[0.14em]",
  );

  const inputClass = classNames(
    "rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] focus:border-[var(--color-accent-500)] focus:outline-none",
    compact
      ? "h-8 w-[4.25rem] shrink-0 px-2 text-xs"
      : "w-full px-3 py-1.5 text-[14px]",
  );

  const summaryClass = classNames(
    "whitespace-nowrap text-[var(--color-ink-500)]",
    compact ? "min-w-0 text-[10px]" : "text-[11px]",
  );

  return (
    <label
      className={classNames(
        "flex flex-col gap-0.5",
        compact ? "min-w-0 shrink-0" : "gap-1",
      )}
    >
      <span className={labelClass}>Warranty (days)</span>
      <div
        className={classNames(
          compact ? "flex items-center gap-1.5" : "flex flex-col gap-1",
        )}
      >
        <input
          type="number"
          value={value}
          min={0}
          step={1}
          onChange={(event) => {
            const parsed = event.target.valueAsNumber;
            onChange(Number.isFinite(parsed) ? parsed : 0);
          }}
          className={inputClass}
        />
        <span className={summaryClass}>{summary}</span>
      </div>
      <FieldError message={error} />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  onChange,
  error,
  compact = false,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
  error?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={classNames(
        "flex flex-col gap-0.5",
        compact ? "min-w-[5.5rem] flex-1 sm:max-w-[7rem]" : "gap-1",
      )}
    >
      <span
        className={
          compact
            ? "text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]"
            : "text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]"
        }
      >
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        disabled={disabled}
        onChange={(e) => {
          const parsed = e.target.valueAsNumber;
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
        className={
          compact
            ? "h-8 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2 text-xs focus:border-[var(--color-accent-500)] focus:outline-none disabled:opacity-50"
            : "rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-[14px] focus:border-[var(--color-accent-500)] focus:outline-none"
        }
      />
      <FieldError message={error} />
    </label>
  );
}
