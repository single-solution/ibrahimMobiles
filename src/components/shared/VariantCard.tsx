import Link from "next/link";
import { BadgeCheck, BatteryMedium, HardDrive } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProductImage } from "@/components/shared/ProductImage";
import { StockTypeBadge } from "@/components/shared/StockTypeBadge";
import { brands } from "@/data/brands";
import type { ConditionGrade, Phone, PhoneVariant } from "@/types";
import {
  calculateDiscountPercent,
  formatBatteryRange,
  formatPrice,
  formatStorage,
} from "@/lib/utils";

interface VariantCardProps {
  phone: Phone;
  variant: PhoneVariant;
}

const GRADE_BG: Record<ConditionGrade, string> = {
  "A+": "var(--color-grade-aplus)",
  A: "var(--color-grade-a)",
  B: "var(--color-grade-b)",
  C: "var(--color-grade-c)",
};

export function VariantCard({ phone, variant }: VariantCardProps) {
  const brand = brands.find((candidate) => candidate.slug === phone.brandSlug);
  const brandName = brand?.name ?? phone.brandSlug;
  const discountPercent = calculateDiscountPercent(
    variant.originalPriceRupees,
    variant.priceRupees,
  );
  const hasDiscount = discountPercent > 0;

  return (
    <Link
      href={`/shop/${phone.slug}?variant=${variant.id}`}
      className="group block focus:outline-none"
    >
      <Card isInteractive className="flex h-full flex-col">
        <div className="relative aspect-square overflow-hidden rounded-t-[var(--radius-lg)] bg-[var(--color-canvas-deep)]">
          <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
            <ProductImage
              imageUrl={phone.imageUrl}
              brandName={brandName}
              modelName={phone.modelName}
              colorName={variant.colorName}
              brandSlug={phone.brandSlug}
            />
          </div>

          <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1 sm:right-3 sm:top-3 sm:gap-1.5">
            <span
              className="inline-flex h-5 items-center rounded-[var(--radius-full)] px-2 text-[10px] font-bold uppercase tracking-[0.04em] text-white shadow-[var(--shadow-sm)] sm:h-6 sm:px-2.5 sm:text-[11px]"
              style={{ backgroundColor: GRADE_BG[variant.grade] }}
            >
              {variant.grade} grade
            </span>
            {variant.isPtaApproved && (
              <span className="inline-flex h-[18px] items-center gap-0.5 rounded-[var(--radius-md)] bg-[var(--color-pak-green)] px-1.5 text-[9px] font-bold uppercase tracking-[0.05em] text-white shadow-[var(--shadow-sm)] sm:h-5 sm:gap-1 sm:text-[10px]">
                <BadgeCheck size={9} strokeWidth={2.8} className="sm:size-[10px]" />
                PTA
              </span>
            )}
          </div>

          {!variant.isInStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-ink-900)]/45 backdrop-blur-[1px]">
              <span className="rounded-[var(--radius-full)] bg-[var(--color-surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-900)] shadow-[var(--shadow-md)] sm:px-4 sm:py-1.5 sm:text-[11px]">
                Sold out
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-2.5 sm:gap-3 sm:p-4">
          <div>
            <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--color-ink-500)] sm:text-[10px]">
              {brandName}
            </p>
            <h3 className="mt-0.5 line-clamp-1 text-[14px] font-semibold tracking-[-0.01em] text-[var(--color-ink-900)] sm:mt-1 sm:text-[17px]">
              {phone.modelName}
            </h3>
            <p className="text-[11px] text-[var(--color-ink-500)] sm:text-xs">{variant.colorName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--color-ink-600)] sm:gap-x-3 sm:gap-y-1.5 sm:text-xs">
            <span className="inline-flex items-center gap-1">
              <HardDrive size={11} className="sm:size-3" />
              {formatStorage(variant.storageGb)}
            </span>
            <span className="inline-flex items-center gap-1">
              <BatteryMedium size={11} className="sm:size-3" />
              {formatBatteryRange(variant.batteryHealthRange)}
            </span>
            <StockTypeBadge stockType={variant.stockType} size="sm" />
          </div>

          <div className="mt-auto flex items-end justify-between gap-1.5 pt-0.5 sm:gap-2 sm:pt-1">
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--color-ink-900)] sm:text-base">
                {formatPrice(variant.priceRupees)}
              </p>
              {hasDiscount && (
                <p className="text-[11px] text-[var(--color-ink-400)] line-through sm:text-xs">
                  {formatPrice(variant.originalPriceRupees)}
                </p>
              )}
            </div>
            <span className="hidden text-xs font-medium text-[var(--color-accent-700)] opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
              View details →
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
