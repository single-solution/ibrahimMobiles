"use client";

import { useEffect, useMemo } from "react";
import { Check, X } from "lucide-react";

import { classNames, formatPrice, type Product, type StorefrontVariant } from "@store/shared";

import { GradeBadge } from "@/components/shared/GradeBadge";

/**
 * Side-by-side variant comparison modal.
 *
 * Schema awareness (Phase 1, PLAN.md §10):
 *   - Variants now carry generic `attributes: Record<string, string>`
 *     (admin-defined per category). The comparison table dynamically
 *     surfaces the union of all attribute keys present across variants,
 *     plus the universal axes (grade, warranty, stock, price).
 *   - There is no `originalPriceRupees` on a variant anymore — discount
 *     strikethrough goes with offers (Phase 7), so the price cell shows
 *     a single number.
 */

interface CompareVariantsProps {
  product: Product;
  brandName: string;
  selectedVariantId: string;
  onClose: () => void;
  onSelect: (variantId: string) => void;
}

const HUMANISE_ATTR = (slug: string): string =>
  slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const isVariantInStock = (variant: StorefrontVariant): boolean =>
  (variant.quantity ?? 0) > 0;

export function CompareVariants({
  product,
  brandName,
  selectedVariantId,
  onClose,
  onSelect,
}: CompareVariantsProps) {
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

  // Union of all attribute keys observed across variants — preserves the
  // order of first appearance so the table layout is stable.
  const attributeKeys = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const variant of product.variants) {
      for (const key of Object.keys(variant.attributes ?? {})) {
        if (!seen.has(key)) {
          seen.add(key);
          ordered.push(key);
        }
      }
    }
    return ordered;
  }, [product.variants]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Compare options of ${product.name}`}
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
              {brandName} {product.name}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-ink-500)]">
              {product.variants.length} options · scroll horizontally to see them all
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
                {product.variants.map((variant) => (
                  <th
                    key={variant.id}
                    scope="col"
                    className={classNames(
                      "min-w-[200px] px-4 py-3 text-left",
                      variant.id === selectedVariantId && "bg-[var(--color-surface)]",
                    )}
                  >
                    <div className="flex flex-col gap-1.5">
                      <GradeBadge
                        categorySlug={product.categorySlug}
                        gradeSlug={variant.gradeSlug}
                        size="sm"
                      />
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
              {attributeKeys.map((attrKey) => (
                <tr key={attrKey}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 w-40 bg-[var(--color-surface)] px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--color-ink-500)]"
                  >
                    {HUMANISE_ATTR(attrKey)}
                  </th>
                  {product.variants.map((variant) => (
                    <td
                      key={variant.id}
                      className={classNames(
                        "px-4 py-3 align-top text-[var(--color-ink-700)]",
                        variant.id === selectedVariantId && "bg-[var(--color-canvas-deep)]",
                      )}
                    >
                      {variant.attributes?.[attrKey] ?? (
                        <span className="text-[var(--color-ink-400)]">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              <tr>
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-40 bg-[var(--color-surface)] px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--color-ink-500)]"
                >
                  Warranty
                </th>
                {product.variants.map((variant) => (
                  <td
                    key={variant.id}
                    className={classNames(
                      "px-4 py-3 align-top text-[var(--color-ink-700)]",
                      variant.id === selectedVariantId && "bg-[var(--color-canvas-deep)]",
                    )}
                  >
                    {variant.warrantyMonths ? `${variant.warrantyMonths} months` : "—"}
                  </td>
                ))}
              </tr>

              <tr>
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-40 bg-[var(--color-surface)] px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--color-ink-500)]"
                >
                  In stock
                </th>
                {product.variants.map((variant) => (
                  <td
                    key={variant.id}
                    className={classNames(
                      "px-4 py-3 align-top text-[var(--color-ink-700)]",
                      variant.id === selectedVariantId && "bg-[var(--color-canvas-deep)]",
                    )}
                  >
                    {isVariantInStock(variant) ? `${variant.quantity} available` : "Sold out"}
                  </td>
                ))}
              </tr>

              <tr className="bg-[var(--color-canvas-deep)]">
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-40 bg-[var(--color-canvas-deep)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-700)]"
                >
                  Price
                </th>
                {product.variants.map((variant) => {
                  const isSelected = variant.id === selectedVariantId;
                  return (
                    <td
                      key={variant.id}
                      className={classNames(
                        "px-4 py-3 align-top",
                        isSelected && "bg-[var(--color-surface)]",
                      )}
                    >
                      <span className="text-base font-semibold tracking-[-0.01em] text-[var(--color-ink-900)]">
                        {formatPrice(variant.priceRupees)}
                      </span>
                    </td>
                  );
                })}
              </tr>

              <tr>
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-40 bg-[var(--color-surface)] px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--color-ink-500)]"
                />
                {product.variants.map((variant) => {
                  const isSelected = variant.id === selectedVariantId;
                  const inStock = isVariantInStock(variant);
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
                        disabled={!inStock}
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
                        ) : inStock ? (
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
