import Link from "next/link";
import { BadgeCheck, BatteryMedium, HardDrive, Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StockTypeBadge } from "@/components/shared/StockTypeBadge";
import { ProductImage } from "@/components/shared/ProductImage";
import { brands } from "@/data/brands";
import { getDefaultVariant, hasAnyOffer, isPhoneInStock } from "@/data/phones";
import type { ConditionGrade, Phone } from "@/types";
import {
  calculateDiscountPercent,
  formatBatteryRange,
  formatPrice,
  formatStorage,
} from "@/lib/utils";

interface PhoneCardProps {
  phone: Phone;
}

const GRADE_BG: Record<ConditionGrade, string> = {
  "A+": "var(--color-grade-aplus)",
  A: "var(--color-grade-a)",
  B: "var(--color-grade-b)",
  C: "var(--color-grade-c)",
};

export function PhoneCard({ phone }: PhoneCardProps) {
  const brand = brands.find((candidate) => candidate.slug === phone.brandSlug);
  const brandName = brand?.name ?? phone.brandSlug;
  const defaultVariant = getDefaultVariant(phone);
  const inStock = isPhoneInStock(phone);
  const hasOffer = hasAnyOffer(phone);
  const discountPercent = calculateDiscountPercent(
    defaultVariant.originalPriceRupees,
    defaultVariant.priceRupees,
  );
  const variantCount = phone.variants.length;
  const isMultiVariant = variantCount > 1;

  return (
    <Link href={`/shop/${phone.slug}`} className="group block focus:outline-none">
      <Card isInteractive className="flex h-full flex-col">
        <div className="relative aspect-square overflow-hidden rounded-t-[var(--radius-lg)] bg-[var(--color-canvas-deep)]">
          <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
            <ProductImage
              imageUrl={phone.imageUrl}
              brandName={brandName}
              modelName={phone.modelName}
              colorName={defaultVariant.colorName}
              brandSlug={phone.brandSlug}
            />
          </div>

          <div className="absolute right-1.5 top-1.5 z-10 flex flex-col items-end gap-1 md:right-3 md:top-3 md:gap-1.5">
            <span
              className="inline-flex h-5 items-center rounded-[var(--radius-full)] px-1.5 text-[10px] font-bold uppercase tracking-[0.04em] text-white shadow-[var(--shadow-sm)] md:h-6 md:px-2.5 md:text-[11px]"
              style={{ backgroundColor: GRADE_BG[defaultVariant.grade] }}
            >
              {defaultVariant.grade}
            </span>
            {defaultVariant.isPtaApproved && (
              <span className="inline-flex h-[18px] items-center gap-0.5 rounded-[var(--radius-md)] bg-[var(--color-pak-green)] px-1.5 text-[9px] font-bold uppercase tracking-[0.05em] text-white shadow-[var(--shadow-sm)] md:h-5 md:gap-1 md:text-[10px]">
                <BadgeCheck size={9} strokeWidth={2.8} className="md:size-[10px]" />
                PTA
              </span>
            )}
          </div>

          {!inStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-ink-900)]/45 backdrop-blur-[1px]">
              <span className="rounded-[var(--radius-full)] bg-[var(--color-surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-900)] shadow-[var(--shadow-md)] md:px-4 md:py-1.5 md:text-[11px]">
                Sold out
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-2.5 md:gap-3 md:p-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-500)] md:text-[11px]">
              {brandName}
            </p>
            <h3 className="line-clamp-1 text-[14px] font-semibold tracking-tight text-[var(--color-ink-900)] md:mt-1 md:text-[17px]">
              {phone.modelName}
            </h3>
            <p className="line-clamp-1 text-[12px] text-[var(--color-ink-500)] md:text-[13px]">{defaultVariant.colorName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--color-ink-600)] md:gap-x-3 md:gap-y-1.5 md:text-[13px]">
            <span className="inline-flex items-center gap-1">
              <HardDrive size={11} className="md:size-[13px]" />
              {formatStorage(defaultVariant.storageGb)}
            </span>
            <span className="inline-flex items-center gap-1">
              <BatteryMedium size={11} className="md:size-[13px]" />
              {formatBatteryRange(defaultVariant.batteryHealthRange)}
            </span>
            <StockTypeBadge stockType={defaultVariant.stockType} size="sm" />
          </div>

          <div className="mt-auto flex items-end justify-between gap-1.5 pt-1 md:gap-2">
            <div>
              {isMultiVariant && (
                <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--color-ink-500)] md:text-[11px]">
                  From
                </p>
              )}
              <p className="text-[15px] font-semibold tracking-tight text-[var(--color-ink-900)] md:text-lg">
                {formatPrice(defaultVariant.priceRupees)}
              </p>
              {hasOffer && discountPercent > 0 && (
                <p className="text-[11px] text-[var(--color-ink-400)] line-through md:text-[13px]">
                  {formatPrice(defaultVariant.originalPriceRupees)}
                </p>
              )}
            </div>
            {isMultiVariant && (
              <span className="inline-flex items-center gap-0.5 rounded-[var(--radius-full)] bg-[var(--color-canvas-deep)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-ink-700)] md:gap-1 md:px-2.5 md:py-1 md:text-[11px]">
                <Layers size={9} className="md:size-[11px]" />
                {variantCount}
                <span className="hidden md:inline"> variants</span>
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
