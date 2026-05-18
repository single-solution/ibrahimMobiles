"use client";

import { useEffect, type ReactNode } from "react";
import { BadgeCheck, Check, Minus, X } from "lucide-react";
import { GradeBadge } from "@/components/shared/GradeBadge";
import {
  calculateDiscountPercent,
  classNames,
  formatBatteryRange,
  formatPrice,
  formatStorage,
  type Phone,
  type PhoneVariant,
} from "@store/shared";

interface CompareVariantsModalProps {
  phone: Phone;
  brandName: string;
  selectedVariantId: string;
  onClose: () => void;
  onSelect: (variantId: string) => void;
}

export function CompareVariantsModal({
  phone,
  brandName,
  selectedVariantId,
  onClose,
  onSelect,
}: CompareVariantsModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function handleSelect(variantId: string) {
    onSelect(variantId);
    onClose();
  }

  const rows: Array<{ label: string; getValue: (variant: PhoneVariant) => ReactNode }> = [
    { label: "Color", getValue: (variant) => variant.colorName },
    { label: "Storage", getValue: (variant) => formatStorage(variant.storageGb) },
    { label: "RAM", getValue: (variant) => `${variant.ramGb} GB` },
    { label: "Battery (range)", getValue: (variant) => formatBatteryRange(variant.batteryHealthRange) },
    {
      label: "PTA approved",
      getValue: (variant) => (variant.isPtaApproved ? <YesCell /> : <NoCell />),
    },
    { label: "Warranty", getValue: (variant) => `${variant.warrantyMonths} months` },
    {
      label: "In stock",
      getValue: (variant) => (variant.isInStock ? <YesCell /> : <NoCell />),
    },
    {
      label: "Notes",
      getValue: (variant) =>
        variant.notes ? (
          <span className="text-xs leading-relaxed">{variant.notes}</span>
        ) : (
          <span className="text-[var(--color-ink-400)]">—</span>
        ),
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Compare options of ${phone.modelName}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close compare"
        onClick={onClose}
        className="animate-sheet-fade absolute inset-0 bg-[var(--color-ink-900)]/40"
      />
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-ink-100)] px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-700)]">
              Compare options
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[var(--color-ink-900)]">
              {brandName} {phone.modelName}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-ink-500)]">
              {phone.variants.length} options · scroll horizontally to see them all
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]">
                <th
                  scope="col"
                  className="sticky left-0 z-20 w-40 bg-[var(--color-canvas-deep)] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]"
                >
                  Spec
                </th>
                {phone.variants.map((variant) => (
                  <th
                    key={variant.id}
                    scope="col"
                    className={classNames(
                      "min-w-[200px] px-4 py-3 text-left",
                      variant.id === selectedVariantId && "bg-[var(--color-surface)]",
                    )}
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <GradeBadge grade={variant.grade} size="sm" />
                      </div>
                      {variant.id === selectedVariantId && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
                          Currently viewing
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-ink-100)]">
              {rows.map((row) => (
                <tr key={row.label}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 w-40 bg-[var(--color-surface)] px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--color-ink-500)]"
                  >
                    {row.label}
                  </th>
                  {phone.variants.map((variant) => (
                    <td
                      key={variant.id}
                      className={classNames(
                        "px-4 py-3 align-top text-[var(--color-ink-700)]",
                        variant.id === selectedVariantId && "bg-[var(--color-canvas-deep)]",
                      )}
                    >
                      {row.getValue(variant)}
                    </td>
                  ))}
                </tr>
              ))}

              <tr className="bg-[var(--color-canvas-deep)]">
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-40 bg-[var(--color-canvas-deep)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-700)]"
                >
                  Price
                </th>
                {phone.variants.map((variant) => {
                  const discountPercent = calculateDiscountPercent(
                    variant.originalPriceRupees,
                    variant.priceRupees,
                  );
                  const isSelected = variant.id === selectedVariantId;
                  return (
                    <td
                      key={variant.id}
                      className={classNames(
                        "px-4 py-3 align-top",
                        isSelected && "bg-[var(--color-surface)]",
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-base font-semibold tracking-[-0.01em] text-[var(--color-ink-900)]">
                          {formatPrice(variant.priceRupees)}
                        </span>
                        {discountPercent > 0 && (
                          <span className="text-xs text-[var(--color-ink-400)] line-through">
                            {formatPrice(variant.originalPriceRupees)}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              <tr>
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-40 bg-[var(--color-surface)] px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--color-ink-500)]"
                />
                {phone.variants.map((variant) => {
                  const isSelected = variant.id === selectedVariantId;
                  return (
                    <td
                      key={variant.id}
                      className={classNames(
                        "px-4 py-3 align-top",
                        isSelected && "bg-[var(--color-canvas-deep)]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelect(variant.id)}
                        disabled={!variant.isInStock}
                        className={classNames(
                          "inline-flex items-center gap-1 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold tracking-tight transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                          isSelected
                            ? "bg-[var(--color-accent-700)] text-white"
                            : "bg-[var(--color-ink-100)] text-[var(--color-ink-800)] hover:bg-[var(--color-accent-700)] hover:text-white",
                        )}
                      >
                        {isSelected ? (
                          <>
                            <Check size={12} strokeWidth={3} />
                            Selected
                          </>
                        ) : variant.isInStock ? (
                          "Pick this one"
                        ) : (
                          "Sold out"
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function YesCell() {
  return (
    <span className="inline-flex items-center gap-1 text-[var(--color-accent-700)]">
      <BadgeCheck size={14} strokeWidth={2.4} />
      Yes
    </span>
  );
}

function NoCell() {
  return (
    <span className="inline-flex items-center gap-1 text-[var(--color-ink-400)]">
      <Minus size={14} />
      No
    </span>
  );
}
