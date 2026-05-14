"use client";

import { Info } from "lucide-react";
import { useSelectedVariantId } from "@/components/shared/VariantContext";
import { getStockTypeDescriptor } from "@/data/stockTypes";
import type { Phone } from "@/types";

interface StockTypeCardProps {
  phone: Phone;
  variant?: "mobile" | "desktop";
}

export function StockTypeCard({ phone, variant = "desktop" }: StockTypeCardProps) {
  const selectedVariantId = useSelectedVariantId();
  const selected =
    phone.variants.find((v) => v.id === selectedVariantId) ?? phone.variants[0];
  const descriptor = getStockTypeDescriptor(selected.stockType);

  if (variant === "mobile") {
    return (
      <section className="app-section">
        <div className="app-section-eyebrow">
          <span>About {descriptor.label}</span>
        </div>
        <div className="rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3.5">
          <div className="flex items-center gap-2 text-[var(--color-accent-700)]">
            <Info size={13} />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em]">
              {descriptor.label}
            </h3>
          </div>
          <p className="mt-2 text-[13px] leading-snug text-[var(--color-ink-700)]">
            {descriptor.description}
          </p>
          {selected.notes && (
            <p className="mt-1.5 text-[13px] font-medium text-[var(--color-ink-900)]">
              On this unit:{" "}
              <span className="font-normal text-[var(--color-ink-700)]">
                {selected.notes}
              </span>
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-12 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-6">
      <div className="flex items-center gap-2 text-[var(--color-accent-700)]">
        <Info size={16} />
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em]">
          About {descriptor.label}
        </h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-700)]">
        {descriptor.description}
      </p>
      {selected.notes && (
        <p className="mt-2 text-sm font-medium text-[var(--color-ink-900)]">
          On this unit:{" "}
          <span className="font-normal text-[var(--color-ink-700)]">
            {selected.notes}
          </span>
        </p>
      )}
    </section>
  );
}
